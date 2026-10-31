const $=id=>document.getElementById(id), KEY='my_all_trips', CURRENT='current_trip_id';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blankFlight=()=>({outbound:{no:'請輸入',dep:'00:00',arr:'00:00',airport:'TPE'},inbound:{no:'請輸入',dep:'00:00',arr:'00:00',airport:'當地'},baggage:'託運 23kg / 手提 7kg'});
const blankHotel=()=>({name:'',enAddress:'',jpAddress:'',station:'',route:'',checkin:'15:00',checkout:'11:00',mapUrl:'',startDay:1,endDay:1});
const sample={id:'trip_okinawa_2026',title:'沖繩親子慢活行',days:5,flight:{outbound:{no:'NU302',dep:'10:05',arr:'12:40',airport:'桃園TPE(T2)'},inbound:{no:'JX871',dep:'15:25',arr:'16:10',airport:'那霸OKA'},baggage:'託運 23kg × 2 / 手提 7kg'},hotel:{name:'沖繩格拉斯麗飯店 (Hotel Gracery Okinawa)',enAddress:'1-3-3 Matsuo, Naha, Okinawa 900-0014',jpAddress:'〒900-0014 沖縄県那覇市松尾1-3-3',station:'牧志站 (Makishi Station) 步行 5 分鐘',route:'從那覇空港搭乘單軌電車到牧志站下車，出站後沿著國際通步行約 5 分鐘即可抵達。',checkin:'15:00',checkout:'11:00',mapUrl:'https://maps.app.goo.gl/SNADjpiHfPsdBMvt8'},spots:[{name:'美麗海水族館',location:'本部町',type:'親子',date:'Day 2'},{name:'暖暮拉麵',location:'那霸市',type:'美食',date:'Day 1'}],dayTitles:{1:'抵達與國際通散步',2:'美麗海水族館',3:'美國村與購物',4:'Outlet 掃貨',5:'伴手禮採買與賦歸'},dayTimelines:{1:[{time:'17:00',title:'暖暮拉麵',note:'美味晚餐'}],2:[{time:'09:00',title:'美麗海水族館',note:'看海豚秀'}],3:[],4:[],5:[]}};
function load(){try{const raw=localStorage.getItem(KEY);const parsed=raw===null?[sample]:JSON.parse(raw);return Array.isArray(parsed)?parsed:[]}catch{return []}}
let trips=[],currentId=null,activeDay=1,dragIndex=null,modalSave=null;
let cloudReady=false, isAdmin=false;
let spotSort="date", spotSortDir="asc";
const SPOT_TYPES=["美食","逛街","體驗","親子"];
const spotTypes=s=>Array.isArray(s.types)&&s.types.length?s.types:(Array.isArray(s.type)?s.type:String(s.type||"").split(/[、,，]/).filter(Boolean));
// Date-only arithmetic in UTC avoids timezone and daylight-saving shifts.
function parseISODate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?d:null}
function tripDayISO(t,day){const start=parseISODate(t.startDate);if(!start)return '';return new Date(start.getTime()+(day-1)*86400000).toISOString().slice(0,10)}
function dayLabel(t,day){const iso=tripDayISO(t,day);if(!iso)return `Day ${day}`;const date=parseISODate(iso);return `${iso.slice(5,7)}/${iso.slice(8,10)}（${'日一二三四五六'[date.getUTCDay()]}）`}
function tripRange(t){return t.startDate&&t.endDate?`${t.startDate.replaceAll('-','/')} ～ ${t.endDate.replaceAll('-','/')}`:`${t.days}天行程`}
function daysBetween(start,end){const a=parseISODate(start),b=parseISODate(end);return a&&b?Math.round((b-a)/86400000)+1:NaN}
const sortTimeline=list=>list.sort((a,b)=>String(a.time||"99:99").localeCompare(String(b.time||"99:99")));
function typeChecks(selected=[]){return `<fieldset class="type-checks"><legend class="label">類型（可複選）</legend><div class="type-options">${[...new Set([...SPOT_TYPES,...selected])].map(type=>`<label><input type="checkbox" name="spotTypes" value="${escapeHTML(type)}" ${selected.includes(type)?"checked":""}> ${escapeHTML(type)}</label>`).join("")}</div></fieldset>`}
function chosenTypes(){return [...document.querySelectorAll('#modal-form input[name="spotTypes"]:checked')].map(x=>x.value)}
try{currentId=(()=>{try{return localStorage.getItem(CURRENT)}catch{return null}})()}catch{}
function normalizeTrip(t){
 if(!t||typeof t!=='object')return null;
 const days=Number(t.days);
 if(typeof t.id!=='string'||!t.id||!Number.isInteger(days)||days<1||days>30)return null;
 const flight=blankFlight(),hotel=blankHotel();
 return {...t,title:String(t.title??'未命名旅程'),days,
 flight:{...flight,...(t.flight||{}),outbound:{...flight.outbound,...(t.flight?.outbound||{})},inbound:{...flight.inbound,...(t.flight?.inbound||{})}},
 hotel:{...hotel,...(t.hotel||{})},hotels:Array.isArray(t.hotels)?t.hotels.filter(h=>h&&typeof h==='object').map(h=>({...hotel,...h})):t.hotel?[{...hotel,...t.hotel,startDay:1,endDay:days}]:[],spots:Array.isArray(t.spots)?t.spots.filter(s=>s&&typeof s==='object'):[],prepItems:Array.isArray(t.prepItems)?t.prepItems.filter(x=>x&&typeof x==='object').map(x=>({text:String(x.text||''),done:!!x.done})):[],exchange:t.exchange&&typeof t.exchange==='object'?t.exchange:{currency:'JPY',rate:0},
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
function render(){document.body.classList.toggle('cloud-admin',isAdmin);document.body.classList.toggle('cloud-viewer',!isAdmin);if(!cloudReady){$('app').innerHTML='<section class="card text-center muted">正在載入雲端行程…</section>';return}const t=current();$('header-nav').innerHTML=t?'<button class="btn btn-soft" data-action="home"><svg class="ui-icon " aria-hidden="true"><use href="#icon-home"></use></svg> 返回旅程列表</button>':'';if(!t){$('app').innerHTML=`<section class="max-w-4xl mx-auto space-y-5"><div class="card flex justify-between items-center gap-3"><div><h2 class="text-xl font-bold text-stone-600"><svg class="ui-icon " aria-hidden="true"><use href="#icon-globe"></use></svg> 我的出遊清單</h2><p class="muted">挑選一本手帳開始規劃，或建立新的旅程！</p></div><button class="btn shrink-0" data-action="new-trip"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增出遊</button></div><div class="grid md:grid-cols-2 gap-4">${trips.length?trips.map(t=>`<article class="card space-y-4"><div class="flex justify-between gap-2"><h3 class="font-bold">${escapeHTML(t.title)}</h3><span class="muted shrink-0">${escapeHTML(tripRange(t))}</span></div><p class="muted">${t.isPublic===false?'🔒 未公開':'🌐 公開'} · 飯店：${escapeHTML(t.hotels?.[0]?.name||'未填寫')}${t.hotels?.length>1?` 等 ${t.hotels.length} 間`:''}</p><div class="flex justify-end gap-2"><button class="btn btn-soft" data-action="toggle-public" data-id="${escapeHTML(t.id)}">${t.isPublic===false?'設為公開':'設為私人'}</button><button class="btn btn-soft" data-action="delete-trip" data-id="${escapeHTML(t.id)}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-trash"></use></svg> 刪除</button><button class="btn" data-action="select" data-id="${escapeHTML(t.id)}">開啟手帳 <svg class="ui-icon " aria-hidden="true"><use href="#icon-arrow"></use></svg></button></div></article>`).join(''):'<div class="card text-center muted">目前還沒有建立任何出遊計畫！</div>'}</div></section>`;return}
$('app').innerHTML=`<div class="card trip-heading"><p class="muted">目前瀏覽的手帳</p><h2 class="text-xl font-bold">${escapeHTML(t.title)} (${escapeHTML(tripRange(t))})</h2></div><div class="grid lg:grid-cols-2 gap-4"><section id="flight-section" class="card flight-card"><div class="flex justify-between items-center mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plane"></use></svg> 航班資訊</h2><button class="btn btn-soft" data-action="flight"><svg class="ui-icon " aria-hidden="true"><use href="#icon-edit"></use></svg> 編輯航班</button></div><div id="flight"></div></section><section id="hotel-section" class="card hotel-card"><div class="flex justify-between items-center mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-hotel"></use></svg> 住宿飯店</h2><button class="btn" data-action="add-hotel"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增飯店</button></div><div id="hotel"></div></section></div><section id="itinerary" class="card itinerary-card"><div class="flex justify-between gap-2 items-center mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-calendar"></use></svg> 每日行程時間軸</h2><button class="btn btn-soft" data-action="day-titles"><svg class="ui-icon " aria-hidden="true"><use href="#icon-edit"></use></svg> 編輯每日標題</button></div><div id="tabs" class="flex gap-2 overflow-x-auto py-2"></div><div id="day-panel" class="bg-stone-50 border rounded-2xl p-4 mt-3"></div></section><section id="spots-section" class="card spots-card"><div class="flex justify-between items-center gap-2 mb-4"><h2 class="font-bold"><svg class="ui-icon " aria-hidden="true"><use href="#icon-pin"></use></svg> 景點口袋清單資料庫</h2><button class="btn" data-action="spot"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增景點</button></div><div class="spot-sort-bar"><label for="spot-sort">排序依據</label><select id="spot-sort" class="field"><option value="date">預計日期</option><option value="location">地點</option><option value="type">類型</option><option value="name">名稱</option></select><button type="button" class="btn btn-soft" data-action="spot-sort-direction" id="spot-sort-dir">升冪 ↑</button></div><div class="overflow-x-auto"><table class="w-full text-left text-sm min-w-[490px]"><thead><tr class="bg-stone-50 text-stone-500"><th class="p-3">名稱</th><th class="p-3">地點</th><th class="p-3">類型</th><th class="p-3">預計日期</th><th class="p-3">操作</th></tr></thead><tbody id="spots"></tbody></table></div></section><section id="prep-section" class="card extra-card"><h2 class="font-bold">🧳 行前準備事項</h2><div id="prep-content"></div></section><section id="exchange-section" class="card extra-card"><h2 class="font-bold">💱 匯率換算計算機</h2><div id="exchange-content"></div></section>`;renderFlight(t);renderHotel(t);renderSpots(t);renderDays(t);renderPrep(t);renderExchange(t)}
function renderFlight(t){const f=t.flight||blankFlight();const table=(label,x)=>`<div><h3 class="font-bold text-sm mb-1">${label}</h3><div class="overflow-x-auto"><table class="w-full text-xs text-left"><thead class="bg-stone-50 text-stone-500"><tr>${['航班編號','出發','抵達','機場(航廈)'].map(v=>`<th class="p-2">${v}</th>`).join('')}</tr></thead><tbody><tr>${['no','dep','arr','airport'].map(k=>`<td class="p-2">${escapeHTML(x?.[k])}</td>`).join('')}</tr></tbody></table></div></div>`;$('flight').innerHTML=`<div class="space-y-4">${table('<svg class="ui-icon " aria-hidden="true"><use href="#icon-plane"></use></svg> 去程航班',f.outbound)}${table('<svg class="ui-icon " aria-hidden="true"><use href="#icon-plane"></use></svg> 回程航班',f.inbound)}<p class="muted">行李限制：${escapeHTML(f.baggage)}</p></div>`}
function safeMap(url){try{const u=new URL(url);return u.protocol==='https:'&&(['maps.app.goo.gl','www.google.com','google.com','maps.google.com'].includes(u.hostname))?u.href:null}catch{return null}}
function mapSearch(q){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q)}
function renderHotel(t){
 const hotels=t.hotels||[];
 $('hotel').innerHTML=hotels.length?`<div class="hotel-list">${hotels.map((h,i)=>{
  const url=safeMap(h.mapUrl)||mapSearch([h.name,h.jpAddress].filter(Boolean).join(' '));
  const start=Math.max(1,Math.min(t.days,Number(h.startDay)||1));
  const end=Math.max(start,Math.min(t.days,Number(h.endDay)||t.days));
  return `<article class="hotel-entry"><div class="hotel-entry-head"><div><span class="hotel-count">住宿 ${i+1}</span><span class="hotel-days">${dayLabel(t,start)}${end!==start?' ～ '+dayLabel(t,end):''}</span><h3 class="hotel-name">${escapeHTML(h.name||'未命名飯店')}</h3></div><div class="hotel-actions"><button class="btn btn-soft" data-action="edit-hotel" data-index="${i}"><svg class="ui-icon" aria-hidden="true"><use href="#icon-edit"></use></svg> 編輯</button><button class="btn btn-soft hotel-delete" data-action="delete-hotel" data-index="${i}"><svg class="ui-icon" aria-hidden="true"><use href="#icon-trash"></use></svg> 刪除</button></div></div><div class="hotel-meta"><p>📍 ${escapeHTML(h.enAddress||h.jpAddress||'尚未填寫地址')}</p>${h.jpAddress&&h.enAddress?`<p>📍 ${escapeHTML(h.jpAddress)}</p>`:''}<p>🚉 ${escapeHTML(h.station||'尚未填寫鄰近車站')}</p>${h.route?`<p>🧭 ${escapeHTML(h.route)}</p>`:''}</div><div class="hotel-foot"><span>🕒 入住 ${escapeHTML(h.checkin)}</span><span>🕒 退房 ${escapeHTML(h.checkout)}</span><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="hotel-map">📍 Google Maps</a></div></article>`;
 }).join('')}</div>`:'<div class="hotel-empty">目前沒有住宿資料，點擊「新增飯店」建立第一間飯店。</div>';
}

const colors={美食:'bg-orange-50 text-orange-700',逛街:'bg-purple-50 text-purple-700',體驗:'bg-teal-50 text-teal-700',親子:'bg-rose-50 text-rose-700'};
function renderSpots(t){
 const sorted=t.spots.map((s,i)=>({s,i})).sort((a,b)=>{
  const val=o=>spotSort==='type'?spotTypes(o.s).join('、'):spotSort==='date'?String(o.s.date||'').replace(/Day\s*(\d+)/i,(_,d)=>String(d).padStart(3,'0')):String(o.s[spotSort]||'');
  return (val(a).localeCompare(val(b),'zh-Hant',{numeric:true})||a.i-b.i)*(spotSortDir==='asc'?1:-1);
 });
 const sort=$('spot-sort');if(sort)sort.value=spotSort;
 const dir=$('spot-sort-dir');if(dir)dir.textContent=spotSortDir==='asc'?'升冪 ↑':'降冪 ↓';
 $('spots').innerHTML=sorted.length?sorted.map(({s,i})=>`<tr class="border-t"><td class="p-3 font-semibold">${escapeHTML(s.name)}</td><td class="p-3">${escapeHTML(s.location)}</td><td class="p-3">${spotTypes(s).map(type=>`<span class="spot-type px-2 py-1 rounded-lg ${colors[type]||'bg-stone-100'}">${escapeHTML(type)}</span>`).join(' ')}</td><td class="p-3">${escapeHTML(s.date)}</td><td class="p-3 whitespace-nowrap"><a class="text-amber-700 mr-2" target="_blank" rel="noopener noreferrer" href="${escapeHTML(safeMap(s.mapUrl)||mapSearch([s.name,s.location].join(' ')))}">📍 導航</a><button data-action="edit-spot" data-index="${i}" class="spot-edit-btn" aria-label="修改景點 ${escapeHTML(s.name)}">修改</button> <button data-action="delete-spot" data-index="${i}" class="text-red-600">刪除</button></td></tr>`).join(''):'<tr><td colspan="5" class="p-4 text-center muted">目前沒有景點，點擊上方按鈕新增！</td></tr>';
}
function renderDays(t){$('tabs').innerHTML=Array.from({length:t.days},(_,i)=>{const d=i+1;return `<button data-action="day" data-day="${d}" class="btn shrink-0 ${activeDay===d?'':'btn-soft'}">${dayLabel(t,d)}<span class="block text-xs font-normal">${escapeHTML(t.dayTitles[d])}</span></button>`}).join('');const list=sortTimeline(t.dayTimelines[activeDay]||[]);$('day-panel').innerHTML=`<div class="flex justify-between items-center gap-3 pb-3 border-b"><h3 class="font-bold">${dayLabel(t,activeDay)} <span class="font-normal text-sm">${escapeHTML(t.dayTitles[activeDay])}</span></h3><button class="btn" data-action="timeline" data-day="${activeDay}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-plus"></use></svg> 新增行程</button></div><div class="space-y-3 mt-3">${list.length?list.map((item,i)=>`<div draggable="true" data-drag-index="${i}" class="bg-white border rounded-2xl p-3 flex justify-between items-center gap-2"><div class="flex gap-3 items-start min-w-0"><span class="text-stone-400"><svg class="ui-icon " aria-hidden="true"><use href="#icon-handle"></use></svg></span><span class="text-xs bg-stone-100 rounded-lg p-2 shrink-0">${escapeHTML(item.time||'10:00')}</span><div class="min-w-0"><p class="font-bold text-sm break-words">${escapeHTML(item.title)}</p>${item.mapUrl&&safeMap(item.mapUrl)?`<a class="timeline-map" href="${escapeHTML(safeMap(item.mapUrl))}" target="_blank" rel="noopener noreferrer">📍 開啟 Google Maps 導航</a>`:''}${item.note?`<p class="muted break-words"><svg class="ui-icon " aria-hidden="true"><use href="#icon-notebook"></use></svg> ${escapeHTML(item.note)}</p>`:''}</div></div><div class="flex shrink-0"><button class="p-2" aria-label="編輯行程" data-action="timeline" data-day="${activeDay}" data-index="${i}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-edit"></use></svg></button><button class="p-2" aria-label="刪除行程" data-action="delete-item" data-day="${activeDay}" data-index="${i}"><svg class="ui-icon " aria-hidden="true"><use href="#icon-trash"></use></svg></button></div></div>`).join(''):'<p class="muted text-center py-6">今天還沒有新增詳細時間軸行程</p>'}</div>`}
function renderPrep(t){
 const list=t.prepItems||[];const completed=list.filter(x=>x.done).length;
 $('prep-content').innerHTML=`<p class="muted">已完成 ${completed} / ${list.length} 項</p><progress class="prep-progress" value="${completed}" max="${Math.max(1,list.length)}"></progress><div class="prep-list">${list.length?list.map((x,i)=>`<div class="prep-item"><label><input type="checkbox" data-prep-index="${i}" ${x.done?'checked':''} ${!isAdmin?'disabled':''}> <span class="${x.done?'prep-done':''}">${escapeHTML(x.text)}</span></label><div class="prep-actions"><button class="btn btn-soft" data-action="prep-edit" data-index="${i}">編輯</button><button class="btn btn-soft" data-action="prep-delete" data-index="${i}">刪除</button></div></div>`).join(''):'<p class="muted">還沒有行前準備事項。</p>'}</div><button class="btn" data-action="prep-add">＋ 新增準備事項</button>`;
}
function editPrep(t,index){
 const old=index===null?'':t.prepItems[index]?.text||'';
 showModal(index===null?'新增行前準備事項':'編輯行前準備事項',field('text','準備事項',old),v=>{const text=v.text.trim();if(!text){alert('請填寫準備事項');return}t.prepItems??=[];if(index===null)t.prepItems.push({text,done:false});else t.prepItems[index].text=text;update(t);closeModal()});
}
const EXCHANGE_CURRENCIES=[['JPY','日圓 JPY'],['KRW','韓元 KRW'],['USD','美元 USD'],['EUR','歐元 EUR'],['THB','泰銖 THB'],['HKD','港幣 HKD'],['SGD','新加坡幣 SGD'],['CNY','人民幣 CNY'],['VND','越南盾 VND']];
function renderExchange(t){
 const ex=t.exchange||{currency:'JPY',rate:0};const currency=EXCHANGE_CURRENCIES.some(x=>x[0]===ex.currency)?ex.currency:'JPY';const rate=Number(ex.rate)||0;
 $('exchange-content').innerHTML=`<p class="muted">自行設定本趟旅行的換算匯率，方便估算消費金額。</p><div class="exchange-grid"><label>外幣幣別<select id="exchange-currency" class="field">${EXCHANGE_CURRENCIES.map(([k,v])=>`<option value="${k}" ${currency===k?'selected':''}>${v}</option>`).join('')}</select></label><label>1 外幣 = 新台幣（自行設定）<input id="exchange-rate" class="field" type="number" min="0.000001" step="any" value="${rate}"></label><label>外幣金額<input id="exchange-amount" class="field" type="number" min="0" step="any" value="1000"></label><div class="exchange-result" aria-live="polite"><span>約合新台幣</span><strong id="exchange-output">—</strong></div></div><button class="btn" data-action="exchange-save">儲存這趟旅程的幣別與匯率</button><p class="muted exchange-disclaimer">此為手動匯率估算工具，並非即時報價；實際刷卡與換匯金額可能不同。</p>`;
 updateExchangeResult();
}
function updateExchangeResult(){const amount=Number($('exchange-amount')?.value),rate=Number($('exchange-rate')?.value);const out=$('exchange-output');if(out)out.textContent=Number.isFinite(amount)&&Number.isFinite(rate)&&amount>=0&&rate>0?'NT$ '+(amount*rate).toLocaleString('zh-TW',{maximumFractionDigits:2}):'請輸入有效金額與匯率'}
function update(t){persist();render()}
function createTrip(){
 const today=new Date();const localToday=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const body=field('title','出遊名稱')+field('startDate','出發日期',localToday,'date')+field('endDate','回程日期',localToday,'date')+'<p class="muted text-sm" id="date-preview" aria-live="polite">請選擇出發與回程日期，系統會自動建立每日行程。</p>';
 showModal('☕ 建立新的出遊行程',body,v=>{
  const title=v.title.trim(),days=daysBetween(v.startDate,v.endDate);
  if(!title||!Number.isInteger(days)||days<1||days>30){alert('請輸入旅程名稱，並選擇有效的出發與回程日期（最多 30 天，回程不可早於出發）');return}
  const t={id:'trip_'+(crypto.randomUUID?.()||Date.now()),title,days,startDate:v.startDate,endDate:v.endDate,flight:blankFlight(),hotel:blankHotel(),hotels:[],spots:[],dayTitles:{},dayTimelines:{}};
  for(let d=1;d<=days;d++){t.dayTitles[d]=d===1?'出發與抵達':d===days?'返程':`第 ${d} 天行程`;t.dayTimelines[d]=[]}
  trips.push(t);activeDay=1;if(!persist()){trips.pop();return}setCurrent(t.id);closeModal();render();
 });
 const preview=()=>{const days=daysBetween($('f-startDate').value,$('f-endDate').value);$('date-preview').textContent=Number.isInteger(days)&&days>0&&days<=30?`✓ 將自動建立 ${days} 天的日期行程`:'請選擇有效日期（回程不可早於出發，最多 30 天）'};
 $('f-startDate').addEventListener('input',preview);$('f-endDate').addEventListener('input',preview);preview();
}
function editFlight(t){const f=t.flight||blankFlight(),keys=[['outbound','去程'],['inbound','回程']],fields=[['no','航班編號'],['dep','出發時間'],['arr','抵達時間'],['airport','出發機場(航廈)']];showModal('✈️ 編輯航班資訊',keys.map(([k,label])=>`<h3 class="font-bold">${label}航班</h3><div class="grid grid-cols-2 gap-2">${fields.map(([name,caption])=>field(k+'_'+name,caption,f[k]?.[name]||'',(name==='dep'||name==='arr')?'time':'text')).join('')}</div>`).join('')+field('baggage','行李限制',f.baggage),v=>{if(!keys.every(([k])=>['dep','arr'].every(name=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v[k+'_'+name])))){alert('請輸入有效的 24 小時制時間（HH:mm）');return}for(const [k] of keys)f[k]=Object.fromEntries(fields.map(([name])=>[name,v[k+'_'+name]]));f.baggage=v.baggage;t.flight=f;update(t);closeModal()})}
function editHotel(t,index=null){
 const isNew=index===null;
 const h=isNew?{...blankHotel(),startDay:1,endDay:t.days}:{...t.hotels[index]};
 const defs=[['name','飯店名稱'],['enAddress','英文地址'],['jpAddress','日文地址'],['station','鄰近車站'],['route','如何前往（交通方式）'],['checkin','入住時間'],['checkout','退房時間'],['mapUrl','Google Maps 地點短網址']];
 const days=Array.from({length:t.days},(_,i)=>({value:String(i+1),label:dayLabel(t,i+1)}));
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

function addSpot(t){
 const body=field('name','景點名稱')+field('location','地點 / 區域')+typeChecks(['美食'])+field('date','預計日期','Day 1','select',Array.from({length:t.days},(_,i)=>({value:`Day ${i+1}`,label:`${dayLabel(t,i+1)} (${t.dayTitles[i+1]||''})`})))+field('mapUrl','Google Maps 地點短網址（選填）');
 showModal('🍁 新增景點到口袋清單',body,v=>{
  if(!v.name.trim()){alert('請輸入景點名稱');return}
  if(v.mapUrl.trim()&&!safeMap(v.mapUrl.trim())){alert('請貼上有效的 Google Maps HTTPS 連結');return}
  const types=chosenTypes();const s={name:v.name.trim(),location:v.location.trim(),type:types.join('、'),types,date:v.date,mapUrl:v.mapUrl.trim()};
  t.spots.push(s);const d=Number(v.date.replace('Day ',''));
  (t.dayTimelines[d]??=[]).push({time:'10:00',title:s.name,note:'',mapUrl:s.mapUrl});sortTimeline(t.dayTimelines[d]);update(t);closeModal();
 });
}
function editSpot(t,index){
 const spot=t.spots[index];if(!spot)return;
 const dates=Array.from({length:t.days},(_,i)=>({value:`Day ${i+1}`,label:`${dayLabel(t,i+1)} (${t.dayTitles[i+1]||''})`}));
 const body=field('name','景點名稱',spot.name)+field('location','地點 / 區域',spot.location)+typeChecks(spotTypes(spot))+field('date','預計日期',spot.date,'select',dates)+field('mapUrl','Google Maps 地點短網址（選填）',spot.mapUrl||'');
 showModal('✏️ 修改景點',body,v=>{
  if(!v.name.trim()){alert('請輸入景點名稱');return}
  if(v.mapUrl.trim()&&!safeMap(v.mapUrl.trim())){alert('請貼上有效的 Google Maps HTTPS 連結');return}
  const old={...spot},types=chosenTypes();t.spots[index]={...spot,name:v.name.trim(),location:v.location.trim(),type:types.join('、'),types,date:v.date,mapUrl:v.mapUrl.trim()};
  if(!persist()){t.spots[index]=old;return}closeModal();render();
 });
}
function editTitles(t){showModal('✏️ 編輯每日行程摘要',Array.from({length:t.days},(_,i)=>field('day'+(i+1),`${dayLabel(t,i+1)} 標題`,t.dayTitles[i+1])).join(''),v=>{for(let d=1;d<=t.days;d++)t.dayTitles[d]=v['day'+d].trim();update(t);closeModal()})}
function editTimeline(t,d,i){
 const item=i===undefined?{time:'10:00',title:'',note:'',mapUrl:''}:t.dayTimelines[d]?.[i];if(!item)return;
 const body=field('time','時間 (24小時制)',item.time,'time')+field('title','行程內容',item.title)+field('mapUrl','Google Maps 地點短網址（選填）',item.mapUrl||'')+field('note','備註',item.note,'textarea');
 showModal(`${i===undefined?'⏰ 新增':'✏️ 編輯'} Day ${d} 行程`,body,v=>{
  if(!v.title.trim()){alert('請輸入行程內容');return}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)){alert('請輸入有效的 24 小時制時間（HH:mm）');return}
  if(v.mapUrl.trim()&&!safeMap(v.mapUrl.trim())){alert('請貼上有效的 Google Maps HTTPS 連結');return}
  const record={...item,time:v.time,title:v.title.trim(),note:v.note.trim(),mapUrl:v.mapUrl.trim()};
  const list=t.dayTimelines[d]??=[];if(i===undefined)list.push(record);else list[i]=record;
  t.dayTimelines[d]=sortTimeline(list);update(t);closeModal();
 });
}
document.querySelector('header').addEventListener('click',e=>{if(e.target.closest('[data-action="home"]')){currentId=null;try{localStorage.removeItem(CURRENT)}catch{}render()}});
$('app').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,t=current(),i=Number(b.dataset.index),d=Number(b.dataset.day);if(!isAdmin&&!['home','select','day'].includes(a)){alert('只有管理員可以編輯行程，請先使用管理員 Google 帳號登入。');return}if(a==='home'){goHome()}else if(a==='toggle-public'){const item=trips.find(x=>x.id===b.dataset.id);if(item){item.isPublic=item.isPublic===false;persist();render()}}else if(a==='new-trip')createTrip();else if(a==='select'){setCurrent(b.dataset.id);activeDay=1;render()}else if(a==='delete-trip'&&confirm('確定要刪除這個出遊計畫嗎？')){trips=trips.filter(x=>x.id!==b.dataset.id);if(currentId===b.dataset.id)setCurrent(null);persist();render()}else if(!t)return;else if(a==='flight')editFlight(t);else if(a==='add-hotel')editHotel(t);else if(a==='edit-hotel')editHotel(t,i);else if(a==='delete-hotel')deleteHotel(t,i);else if(a==='prep-add')editPrep(t,null);else if(a==='prep-edit')editPrep(t,i);else if(a==='prep-delete'&&confirm('確定刪除這項準備事項嗎？')){t.prepItems.splice(i,1);update(t)}else if(a==='exchange-save'){const rate=Number($('exchange-rate').value);if(!Number.isFinite(rate)||rate<=0){alert('請輸入大於 0 的匯率');return}t.exchange={currency:$('exchange-currency').value,rate};persist();alert('匯率已儲存至雲端')}else if(a==='spot-sort-direction'){spotSortDir=spotSortDir==='asc'?'desc':'asc';renderSpots(t)}else if(a==='spot')addSpot(t);else if(a==='edit-spot')editSpot(t,i);else if(a==='day-titles')editTitles(t);else if(a==='day'){activeDay=d;renderDays(t)}else if(a==='timeline')editTimeline(t,d,b.hasAttribute('data-index')?i:undefined);else if(a==='delete-spot'&&confirm('確定要刪除這個景點嗎？')){t.spots.splice(i,1);update(t)}else if(a==='delete-item'&&confirm('確定要刪除這個詳細行程嗎？')){t.dayTimelines[d].splice(i,1);update(t)}});
$('modal').addEventListener('click',e=>{if(e.target.closest('[data-action="close"]'))closeModal()});
$('app').addEventListener('input',e=>{if(['exchange-amount','exchange-rate'].includes(e.target.id))updateExchangeResult()});
$('app').addEventListener('change',e=>{if(e.target.matches('[data-prep-index]')){if(!isAdmin)return;const t=current(),i=Number(e.target.dataset.prepIndex);if(t?.prepItems?.[i]){t.prepItems[i].done=e.target.checked;update(t)}return}if(e.target.id==='spot-sort'){spotSort=e.target.value;const t=current();if(t)renderSpots(t)}});
$('app').addEventListener('dragstart',e=>{const row=e.target.closest('[data-drag-index]');if(!row||!isAdmin)return;dragIndex=Number(row.dataset.dragIndex);row.classList.add('dragging');e.dataTransfer.effectAllowed='move'});
$('app').addEventListener('dragover',e=>{const row=e.target.closest('[data-drag-index]');if(!row)return;e.preventDefault();document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));row.classList.add('drag-over')});
$('app').addEventListener('drop',e=>{const row=e.target.closest('[data-drag-index]');if(!row||!isAdmin||dragIndex===null)return;e.preventDefault();const target=Number(row.dataset.dragIndex),t=current(),list=t?.dayTimelines?.[activeDay];if(!list||dragIndex<0||dragIndex>=list.length){dragIndex=null;return}if(dragIndex!==target){list.splice(target,0,list.splice(dragIndex,1)[0]);sortTimeline(list);update(t)}dragIndex=null;document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))});
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
