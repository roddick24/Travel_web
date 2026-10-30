const $=id=>document.getElementById(id), KEY='my_all_trips', CURRENT='current_trip_id';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blankFlight=()=>({outbound:{no:'請輸入',dep:'00:00',arr:'00:00',airport:'TPE'},inbound:{no:'請輸入',dep:'00:00',arr:'00:00',airport:'當地'},baggage:'託運 23kg / 手提 7kg'});
const blankHotel=()=>({name:'',enAddress:'',jpAddress:'',station:'',route:'',checkin:'15:00',checkout:'11:00',mapUrl:'',startDay:1,endDay:1});
const sample={id:'trip_okinawa_2026',title:'沖繩親子慢活行',days:5,flight:{outbound:{no:'NU302',dep:'10:05',arr:'12:40',airport:'桃園TPE(T2)'},inbound:{no:'JX871',dep:'15:25',arr:'16:10',airport:'那霸OKA'},baggage:'託運 23kg × 2 / 手提 7kg'},hotel:{name:'沖繩格拉斯麗飯店 (Hotel Gracery Okinawa)',enAddress:'1-3-3 Matsuo, Naha, Okinawa 900-0014',jpAddress:'〒900-0014 沖縄県那覇市松尾1-3-3',station:'牧志站 (Makishi Station) 步行 5 分鐘',route:'從那覇空港搭乘單軌電車到牧志站下車，出站後沿著國際通步行約 5 分鐘即可抵達。',checkin:'15:00',checkout:'11:00',mapUrl:'https://maps.app.goo.gl/SNADjpiHfPsdBMvt8'},spots:[{name:'美麗海水族館',location:'本部町',type:'親子',date:'Day 2'},{name:'暖暮拉麵',location:'那霸市',type:'美食',date:'Day 1'}],dayTitles:{1:'抵達與國際通散步',2:'美麗海水族館',3:'美國村與購物',4:'Outlet 掃貨',5:'伴手禮採買與賦歸'},dayTimelines:{1:[{time:'17:00',title:'暖暮拉麵',note:'美味晚餐'}],2:[{time:'09:00',title:'美麗海水族館',note:'看海豚秀'}],3:[],4:[],5:[]}};
function load(){try{const raw=localStorage.getItem(KEY);const parsed=raw===null?[sample]:JSON.parse(raw);return Array.isArray(parsed)?parsed:[]}catch{return []}}
let trips=[],currentId=null,activeDay=1,dragIndex=null,modalSave=null;
let cloudReady=false, isAdmin=false;
try{currentId=(()=>{try{return localStorage.getItem(CURRENT)}catch{return null}})()}catch{}
function normalizeTrip(t){
 if(!t||typeof t!=='object')return null;
 const days=Number(t.days);
 if(typeof t.id!=='string'||!t.id||!Number.isInteger(days)||days<1||days>30)return null;
 const flight=blankFlight(),hotel=blankHotel();
 return {...t,title:String(t.title??'未命名旅程'),days,
 flight:{...flight,...(t.flight||{}),outbound:{...flight.outbound,...(t.flight?.outbound||{})},inbound:{...flight.inbound,...(t.flight?.inbound||{})}},
 hotel:{...hotel,...(t.hotel||{})},hotels:Array.isArray(t.hotels)?t.hotels.filter(h=>h&&typeof h==='object').map(h=>({...hotel,...h})):t.hotel?[{...hotel,...t.hotel,startDay:1,endDay:days}]:[],spots:Array.isArray(t.spots)?t.spots.filter(s=>s&&typeof s==='object'):[],
 dayTitles:t.dayTitles&&typeof t.dayTitles==='object'?t.dayTitles:{},
 dayTimelines:Object.fromEntries(Array.from({length:days},(_,i)=>{const d=i+1;return [d,Array.isArray(t.dayTimelines?.[d])?t.dayTimelines[d].filter(x=>x&&typeof x==='object'):[]]}))};
}
trips=trips.map(normalizeTrip).filter(Boolean);
if(!trips.some(t=>t.id===currentId))currentId=null;
function setCurrent(id){currentId=id;try{if(id)localStorage.setItem(CURRENT,id);else localStorage.removeItem(CURRENT)}catch{}}
function goHome(){setCurrent(null);activeDay=1;render()}
function current(){return trips.find(t=>t.id===currentId)}
function persist(){if(!cloudReady||!isAdmin||!window.cloudSave){alert('尚未取得管理員雲端編輯權限');return false}window.cloudSave(trips.map(t=>({...t,isPublic:t.isPublic!==false})));return true}
function field(name,label,value='',type='text',options=[]){const id='f-'+name;const control=type==='select'?`<select class="field" id="${id}" name="${name}">${options.map(o=>`<option value="${escapeHTML(o.value)}" ${String(o.value)===String(value)?'selected':''}>${escapeHTML(o.label)}</option>`).join('')}</select>`:type==='textarea'?`<textarea class="field" id="${id}" name="${name}" rows="2">${escapeHTML(value)}</textarea>`:`<input class="field" id="${id}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${name==='days'?'min="1" max="30"':''}>`;return `<div><label class="label" for="${id}">${escapeHTML(label)}</label>${control}</div>`}
function showModal(title,body,onSave){$('modal-title').textContent=title;$('modal-form').innerHTML=body+`<div class="flex justify-end gap-2 pt-3"><button type="button" data-action="close" class="btn btn-soft">取消</button><button class="btn" type="submit">儲存</button></div>`;modalSave=onSave;$('modal').classList.remove('hidden');document.body.style.overflow='hidden';$('modal-form').querySelector('input,select,textarea')?.focus()}
function closeModal(){$('modal').classList.add('hidden');document.body.style.overflow='';modalSave=null;$('modal-form').innerHTML=''}
function values(){return Object.fromEntries(new FormData($('modal-form')).entries())}
$('modal-form').addEventListener('submit',e=>{e.preventDefault();if(modalSave)modalSave(values())});
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').classList.contains('hidden'))closeModal()});
function render(){document.body.classList.toggle('cloud-admin',isAdmin);document.body.classList.toggle('cloud-viewer',!isAdmin);if(!cloudReady){$('app').innerHTML='<section class="card text-center muted">正在載入雲端行程…</section>';return}const t=current();$('header-nav').innerHTML=t?'<button class="btn btn-soft" data-action="home"><svg class="ui-icon " aria-hidden="true"><use href="#icon-home"></use></svg> 返回旅程列表</button>':'';if(!t){$('app').innerHTML=`<section class="max-w-4xl mx-auto space-y-5"><div class="card flex justify-between items-center gap-3"><div><h2 class="text-xl font-bold text-stone-600"><svg class="ui-icon " aria-hidden="true"><use href="#icon-globe"></use></svg> 我的出遊清單</h2><p class="muted">挑選一本手帳開始規劃，或建立新的旅程！</p></div><button class="btn shrink-0" data-action="new-trip"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增出遊</button></div><div class="grid md:grid-cols-2 gap-4">${trips.length?trips.map(t=>`<article class="card space-y-4"><div class="flex justify-between gap-2"><h3 class="font-bold">${escapeHTML(t.title)}</h3><span class="muted shrink-0">${t.days}天行程</span></div><p class="muted">${t.isPublic===false?'🔒 未公開':'🌐 公開'} · 飯店：${escapeHTML(t.hotels?.[0]?.name||'未填寫')}${t.hotels?.length>1?` 等 ${t.hotels.length} 間`:''}</p><div class="flex justify-end gap-2"><button class="btn btn-soft" data-action="toggle-public" data-id="${escapeHTML(t.id)}">${t.isPublic===false?'設為公開':'設為私人'}</button><button class="btn btn-soft" data-action="delete-trip" data-id="${escapeHTML(t.id)}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-trash"></use></svg> 刪除</button><button class="btn" data-action="select" data-id="${escapeHTML(t.id)}">開啟手帳 <svg class="ui-icon " aria-hidden="true"><use href="#icon-arrow"></use></svg></button></div></article>`).join(''):'<div class="card text-center muted">目前還沒有建立任何出遊計畫！</div>'}</div></section>`;return}
$('app').innerHTML=`<div class="card trip-heading"><p class="muted">目前瀏覽的手帳</p><h2 class="text-xl font-bold">${escapeHTML(t.title)} (${t.days}天行程)</h2></div><div class="grid lg:grid-cols-2 gap-4"><section id="flight-section" class="card flight-card"><div class="flex justify-between items-center mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plane"></use></svg> 航班資訊</h2><button class="btn btn-soft" data-action="flight"><svg class="ui-icon " aria-hidden="true"><use href="#icon-edit"></use></svg> 編輯航班</button></div><div id="flight"></div></section><section id="hotel-section" class="card hotel-card"><div class="flex justify-between items-center mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-hotel"></use></svg> 住宿飯店</h2><button class="btn" data-action="add-hotel"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增飯店</button></div><div id="hotel"></div></section></div><section id="itinerary" class="card itinerary-card"><div class="flex justify-between gap-2 items-center mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-calendar"></use></svg> 每日行程時間軸</h2><button class="btn btn-soft" data-action="day-titles"><svg class="ui-icon " aria-hidden="true"><use href="#icon-edit"></use></svg> 編輯每日標題</button></div><div id="tabs" class="flex gap-2 overflow-x-auto py-2"></div><div id="day-panel" class="bg-stone-50 border rounded-2xl p-4 mt-3"></div></section><section id="spots-section" class="card spots-card"><div class="flex justify-between items-center gap-2 mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-pin"></use></svg> 景點口袋清單資料庫</h2><button class="btn" data-action="spot"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增景點</button></div><div class="overflow-x-auto"><table class="w-full text-left text-sm min-w-[490px]"><thead><tr class="bg-stone-50 text-stone-500"><th class="p-3">名稱</th><th class="p-3">地點</th><th class="p-3">類型</th><th class="p-3">預計日期</th><th class="p-3">操作</th></tr></thead><tbody id="spots"></tbody></table></div></section>`;renderFlight(t);renderHotel(t);renderSpots(t);renderDays(t)}
function renderFlight(t){const f=t.flight||blankFlight();const table=(label,x)=>`<div><h3 class="font-bold text-sm mb-1">${label}</h3><div class="overflow-x-auto"><table class="w-full text-xs text-left"><thead class="bg-stone-50 text-stone-500"><tr>${['航班編號','出發','抵達','機場(航廈)'].map(v=>`<th class="p-2">${v}</th>`).join('')}</tr></thead><tbody><tr>${['no','dep','arr','airport'].map(k=>`<td class="p-2">${escapeHTML(x?.[k])}</td>`).join('')}</tr></tbody></table></div></div>`;$('flight').innerHTML=`<div class="space-y-4">${table('<svg class="ui-icon " aria-hidden="true"><use href="#icon-plane"></use></svg> 去程航班',f.outbound)}${table('<svg class="ui-icon " aria-hidden="true"><use href="#icon-plane"></use></svg> 回程航班',f.inbound)}<p class="muted">行李限制：${escapeHTML(f.baggage)}</p></div>`}
function safeMap(url){try{const u=new URL(url);return u.protocol==='https:'&&(['maps.app.goo.gl','www.google.com','google.com','maps.google.com'].includes(u.hostname))?u.href:null}catch{return null}}
function mapSearch(q){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)}
function renderHotel(t){
 const hotels=t.hotels||[];
 $('hotel').innerHTML=hotels.length?`<div class="hotel-list">${hotels.map((h,i)=>{
  const url=safeMap(h.mapUrl)||mapSearch([h.name,h.jpAddress].filter(Boolean).join(' '));
  const start=Math.max(1,Math.min(t.days,Number(h.startDay)||1));
  const end=Math.max(start,Math.min(t.days,Number(h.endDay)||t.days));
  return `<article class="hotel-entry"><div class="hotel-entry-head"><div><span class="hotel-count">住宿 ${i+1}</span><span class="hotel-days">Day ${start}${end!==start?'–'+end:''}</span><h3 class="hotel-name">${escapeHTML(h.name||'未命名飯店')}</h3></div><div class="hotel-actions"><button class="btn btn-soft" data-action="edit-hotel" data-index="${i}"><svg class="ui-icon" aria-hidden="true"><use href="#icon-edit"></use></svg> 編輯</button><button class="btn btn-soft hotel-delete" data-action="delete-hotel" data-index="${i}"><svg class="ui-icon" aria-hidden="true"><use href="#icon-trash"></use></svg> 刪除</button></div></div><div class="hotel-meta"><p>📍 ${escapeHTML(h.enAddress||h.jpAddress||'尚未填寫地址')}</p>${h.jpAddress&&h.enAddress?`<p>📍 ${escapeHTML(h.jpAddress)}</p>`:''}<p>🚉 ${escapeHTML(h.station||'尚未填寫鄰近車站')}</p>${h.route?`<p>🧭 ${escapeHTML(h.route)}</p>`:''}</div><div class="hotel-foot"><span>🕒 入住 ${escapeHTML(h.checkin)}</span><span>🕒 退房 ${escapeHTML(h.checkout)}</span><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="hotel-map">📍 Google Maps</a></div></article>`;
 }).join('')}</div>`:'<div class="hotel-empty">目前沒有住宿資料，點擊「新增飯店」建立第一間飯店。</div>';
}

const colors={美食:'bg-orange-50 text-orange-700',逛街:'bg-purple-50 text-purple-700',體驗:'bg-teal-50 text-teal-700',親子:'bg-rose-50 text-rose-700'};
function renderSpots(t){$('spots').innerHTML=t.spots.length?t.spots.map((s,i)=>`<tr class="border-t"><td class="p-3 font-semibold">${escapeHTML(s.name)}</td><td class="p-3">${escapeHTML(s.location)}</td><td class="p-3"><span class="px-2 py-1 rounded-lg ${colors[s.type]||'bg-stone-100'}">${escapeHTML(s.type)}</span></td><td class="p-3">${escapeHTML(s.date)}</td><td class="p-3 whitespace-nowrap"><a class="text-amber-700 mr-2" target="_blank" rel="noopener noreferrer" href="${escapeHTML(mapSearch([s.name,s.location].join(' ')))}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-map"></use></svg> 導航</a><button data-action="edit-spot" data-index="${i}" class="spot-edit-btn" aria-label="修改景點 ${escapeHTML(s.name)}"><svg class="ui-icon" aria-hidden="true"><use href="#icon-edit"></use></svg> 修改</button> <button data-action="delete-spot" data-index="${i}" class="text-red-600"><svg class="ui-icon " aria-hidden="true"><use href="#icon-trash"></use></svg> 刪除</button></td></tr>`).join(''):'<tr><td colspan="5" class="p-4 text-center muted">目前沒有景點，點擊上方按鈕新增！</td></tr>'}
function renderDays(t){$('tabs').innerHTML=Array.from({length:t.days},(_,i)=>{const d=i+1;return `<button data-action="day" data-day="${d}" class="btn shrink-0 ${activeDay===d?'':'btn-soft'}">Day ${d}<span class="block text-xs font-normal">${escapeHTML(t.dayTitles[d])}</span></button>`}).join('');const list=t.dayTimelines[activeDay]||[];$('day-panel').innerHTML=`<div class="flex justify-between items-center gap-3 pb-3 border-b"><h3 class="font-bold">Day ${activeDay} <span class="font-normal text-sm">${escapeHTML(t.dayTitles[activeDay])}</span></h3><button class="btn" data-action="timeline" data-day="${activeDay}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增行程</button></div><div class="space-y-3 mt-3">${list.length?list.map((item,i)=>`<div draggable="true" data-drag-index="${i}" class="bg-white border rounded-2xl p-3 flex justify-between items-center gap-2"><div class="flex gap-3 items-start min-w-0"><span class="text-stone-400"><svg class="ui-icon " aria-hidden="true"><use href="#icon-handle"></use></svg></span><span class="text-xs bg-stone-100 rounded-lg p-2 shrink-0">${escapeHTML(item.time||'10:00')}</span><div class="min-w-0"><p class="font-bold text-sm break-words">${escapeHTML(item.title)}</p>${item.note?`<p class="muted break-words"><svg class="ui-icon " aria-hidden="true"><use href="#icon-notebook"></use></svg> ${escapeHTML(item.note)}</p>`:''}</div></div><div class="flex shrink-0"><button class="p-2" aria-label="編輯行程" data-action="timeline" data-day="${activeDay}" data-index="${i}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-edit"></use></svg></button><button class="p-2" aria-label="刪除行程" data-action="delete-item" data-day="${activeDay}" data-index="${i}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-trash"></use></svg></button></div></div>`).join(''):'<p class="muted text-center py-6">今天還沒有新增詳細時間軸行程</p>'}</div>`}
function update(t){persist();render()}
function createTrip(){showModal('☕ 建立新的出遊行程',field('title','出遊名稱')+field('days','出遊天數','5','number'),v=>{const title=v.title.trim(),days=Number(v.days);if(!title||!Number.isInteger(days)||days<1||days>30){alert('請輸入名稱及 1～30 天的有效天數');return}const t={id:'trip_'+(crypto.randomUUID?.()||Date.now()),title,days,flight:blankFlight(),hotel:blankHotel(),hotels:[],spots:[],dayTitles:{},dayTimelines:{}};for(let d=1;d<=days;d++){t.dayTitles[d]=d===1?'出發與抵達':`第 ${d} 天行程`;t.dayTimelines[d]=[]}trips.push(t);activeDay=1;if(!persist()){trips.pop();return}setCurrent(t.id);closeModal();render()})}
function editFlight(t){const f=t.flight||blankFlight(),keys=[['outbound','去程'],['inbound','回程']],fields=[['no','航班編號'],['dep','出發時間'],['arr','抵達時間'],['airport','出發機場(航廈)']];showModal('✈️ 編輯航班資訊',keys.map(([k,label])=>`<h3 class="font-bold">${label}航班</h3><div class="grid grid-cols-2 gap-2">${fields.map(([name,caption])=>field(k+'_'+name,caption,f[k]?.[name]||'',(name==='dep'||name==='arr')?'time':'text')).join('')}</div>`).join('')+field('baggage','行李限制',f.baggage),v=>{if(!keys.every(([k])=>['dep','arr'].every(name=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v[k+'_'+name])))){alert('請輸入有效的 24 小時制時間（HH:mm）');return}for(const [k] of keys)f[k]=Object.fromEntries(fields.map(([name])=>[name,v[k+'_'+name]]));f.baggage=v.baggage;t.flight=f;update(t);closeModal()})}
function editHotel(t,index=null){
 const isNew=index===null;
 const h=isNew?{...blankHotel(),startDay:1,endDay:t.days}:{...t.hotels[index]};
 const defs=[['name','飯店名稱'],['enAddress','英文地址'],['jpAddress','日文地址'],['station','鄰近車站'],['route','如何前往（交通方式）'],['checkin','入住時間'],['checkout','退房時間'],['mapUrl','Google Maps 地點短網址']];
 const days=Array.from({length:t.days},(_,i)=>({value:String(i+1),label:`Day ${i+1}`}));
 const body=field('startDay','從哪一天入住',h.startDay,'select',days)+field('endDay','住宿到哪一天',h.endDay,'select',days)+defs.map(([k,l])=>field(k,l,h[k],k==='route'?'textarea':(k==='checkin'||k==='checkout')?'time':'text')).join('');
 showModal(isNew?'🏨 新增住宿飯店':'🏨 編輯住宿飯店',body,v=>{
  if(!v.name.trim()){alert('請輸入飯店名稱');return}
  const start=Number(v.startDay),end=Number(v.endDay);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>t.days||start>end){alert('住宿日期範圍不正確，結束日不能早於開始日');return}
  if(!['checkin','checkout'].every(k=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v[k]))){alert('請輸入有效的 24 小時制入住與退房時間（HH:mm）');return}
  if(v.mapUrl.trim()&&!safeMap(v.mapUrl.trim())){alert('請輸入有效的 Google Maps HTTPS 網址');return}
  const entry={...v,name:v.name.trim(),startDay:start,endDay:end,mapUrl:v.mapUrl.trim()};
  if(isNew)t.hotels.push(entry);else t.hotels[index]=entry;
  t.hotel=t.hotels[0]||blankHotel();update(t);closeModal();
 });
}
function deleteHotel(t,index){
 if(!confirm(`確定刪除「${t.hotels[index]?.name||'這間飯店'}」嗎？其他住宿資料不會受到影響。`))return;
 t.hotels.splice(index,1);t.hotel=t.hotels[0]||blankHotel();update(t);
}

function addSpot(t){showModal('🍁 新增景點到口袋清單',field('name','景點名稱')+field('location','地點 / 區域')+field('type','類型','美食','select',['美食','逛街','體驗','親子'].map(x=>({value:x,label:x})))+field('date','預計日期','Day 1','select',Array.from({length:t.days},(_,i)=>({value:`Day ${i+1}`,label:`Day ${i+1} (${t.dayTitles[i+1]||''})`}))),v=>{if(!v.name.trim()){alert('請輸入景點名稱');return}const s={name:v.name.trim(),location:v.location.trim()||'市區',type:v.type,date:v.date};t.spots.push(s);const d=Number(v.date.replace('Day ',''));(t.dayTimelines[d]??=[]).push({time:'10:00',title:s.name,note:`[${s.type}] 地點: ${s.location}`});update(t);closeModal()})}
function editSpot(t,index){
 const spot=t.spots[index];
 if(!spot)return;
 const options=['美食','逛街','體驗','親子'];
 const typeOptions=[...new Set([...options,String(spot.type||'美食')])].map(x=>({value:x,label:x}));
 const dates=Array.from({length:t.days},(_,i)=>({value:`Day ${i+1}`,label:`Day ${i+1} (${t.dayTitles[i+1]||''})`}));
 if(spot.date&&!dates.some(x=>x.value===spot.date))dates.unshift({value:spot.date,label:spot.date});
 const body=field('name','景點名稱',spot.name)+field('location','地點 / 區域',spot.location)+field('type','類型',spot.type,'select',typeOptions)+field('date','預計日期',spot.date,'select',dates);
 showModal('✏️ 修改景點',body,v=>{
  const name=v.name.trim();
  if(!name){alert('請輸入景點名稱');return}
  const old={...spot};
  const updated={...spot,name,location:v.location.trim()||'市區',type:v.type,date:v.date};
  t.spots[index]=updated;
  if(!persist()){t.spots[index]=old;return}
  closeModal();
  render();
 });
}
function editTitles(t){showModal('✏️ 編輯每日行程摘要',Array.from({length:t.days},(_,i)=>field('day'+(i+1),`Day ${i+1} 標題`,t.dayTitles[i+1])).join(''),v=>{for(let d=1;d<=t.days;d++)t.dayTitles[d]=v['day'+d].trim();update(t);closeModal()})}
function editTimeline(t,d,i){const item=i===undefined?{time:'10:00',title:'',note:''}:t.dayTimelines[d]?.[i];if(!item)return;showModal(`${i===undefined?'⏰ 新增':'✏️ 編輯'} Day ${d} 行程`,field('time','時間 (24小時制)',item.time,'time')+field('title','行程內容',item.title)+field('note','備註',item.note,'textarea'),v=>{if(!v.title.trim()){alert('請輸入行程內容');return}if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)){alert('請輸入有效的 24 小時制時間（HH:mm）');return}const record={time:v.time,title:v.title.trim(),note:v.note.trim()};const list=t.dayTimelines[d]??=[];if(i===undefined)list.push(record);else list[i]=record;t.dayTimelines[d]=list;update(t);closeModal()})}
document.querySelector('header').addEventListener('click',e=>{if(e.target.closest('[data-action="home"]')){currentId=null;try{localStorage.removeItem(CURRENT)}catch{}render()}});
$('app').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,t=current(),i=Number(b.dataset.index),d=Number(b.dataset.day);if(!isAdmin&&!['home','select','day'].includes(a)){alert('只有管理員可以編輯行程，請先使用管理員 Google 帳號登入。');return}if(a==='home'){goHome()}else if(a==='toggle-public'){const item=trips.find(x=>x.id===b.dataset.id);if(item){item.isPublic=item.isPublic===false;persist();render()}}else if(a==='new-trip')createTrip();else if(a==='select'){setCurrent(b.dataset.id);activeDay=1;render()}else if(a==='delete-trip'&&confirm('確定要刪除這個出遊計畫嗎？')){trips=trips.filter(x=>x.id!==b.dataset.id);if(currentId===b.dataset.id)setCurrent(null);persist();render()}else if(!t)return;else if(a==='flight')editFlight(t);else if(a==='add-hotel')editHotel(t);else if(a==='edit-hotel')editHotel(t,i);else if(a==='delete-hotel')deleteHotel(t,i);else if(a==='spot')addSpot(t);else if(a==='edit-spot')editSpot(t,i);else if(a==='day-titles')editTitles(t);else if(a==='day'){activeDay=d;renderDays(t)}else if(a==='timeline')editTimeline(t,d,b.hasAttribute('data-index')?i:undefined);else if(a==='delete-spot'&&confirm('確定要刪除這個景點嗎？')){t.spots.splice(i,1);update(t)}else if(a==='delete-item'&&confirm('確定要刪除這個詳細行程嗎？')){t.dayTimelines[d].splice(i,1);update(t)}});
$('modal').addEventListener('click',e=>{if(e.target.closest('[data-action="close"]'))closeModal()});
$('app').addEventListener('dragstart',e=>{const row=e.target.closest('[data-drag-index]');if(!row||!isAdmin)return;dragIndex=Number(row.dataset.dragIndex);row.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
$('app').addEventListener('dragover',e=>{const row=e.target.closest('[data-drag-index]');if(!row)return;e.preventDefault();document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));row.classList.add('drag-over')});
$('app').addEventListener('drop',e=>{const row=e.target.closest('[data-drag-index]');if(!row||!isAdmin||dragIndex===null)return;e.preventDefault();const target=Number(row.dataset.dragIndex),t=current(),list=t?.dayTimelines?.[activeDay];if(!list||dragIndex<0||dragIndex>=list.length){dragIndex=null;return}if(dragIndex!==target){list.splice(target,0,list.splice(dragIndex,1)[0]);update(t)}dragIndex=null;document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))});
$('app').addEventListener('dragleave',e=>{const row=e.target.closest('[data-drag-index]');if(row&&!row.contains(e.relatedTarget))row.classList.remove('drag-over')});
$('app').addEventListener('dragend',()=>{dragIndex=null;document.querySelectorAll('.dragging,.drag-over').forEach(x=>x.classList.remove('dragging','drag-over'))});
window.addEventListener('cloud-trips',event=>{cloudReady=true;isAdmin=!!event.detail.admin;trips=event.detail.trips.map(normalizeTrip).filter(Boolean);if(!trips.some(t=>t.id===currentId))currentId=null;render()});
window.addEventListener('cloud-loading',()=>{cloudReady=false;render()});
window.addEventListener('cloud-error',event=>{$('app').innerHTML='<section class="card text-center">雲端讀取失敗：'+escapeHTML(event.detail)+'</section>';cloudReady=false});
render();


// 左側導覽：保留原本旅程資料與功能。
document.querySelector('.desktop-sidebar').addEventListener('click', e => {
  if(e.target.closest('[data-action="home"]')) { goHome(); return; }
  const link=e.target.closest('a[href^="#"]');
  if(!link) return;
  e.preventDefault();
  const section=document.getElementById(link.getAttribute('href').slice(1));
  if(section) section.scrollIntoView({behavior:'smooth',block:'start'});
});
