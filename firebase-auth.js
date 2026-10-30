// 第一階段：僅啟用 Firebase Google 登入以取得 UID，不改變原有本機資料與編輯權限。
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getFirestore, collection, query, where, onSnapshot, writeBatch, doc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCxc6LEdv7M6lImqGFrSJwgBUt5D3-ISYg',
  authDomain: 'travel-journal-af628.firebaseapp.com',
  projectId: 'travel-journal-af628',
  storageBucket: 'travel-journal-af628.firebasestorage.app',
  messagingSenderId: '177806311533',
  appId: '1:177806311533:web:20281d990d1d75f34d7f64'
};
const status=document.getElementById('auth-status');
const diag=document.createElement('div');
diag.id='auth-diagnostics';
diag.setAttribute('role','status');
diag.style.cssText='margin:8px 0;padding:10px 12px;border:1px solid #b5d9e4;background:#eff8fa;color:#345b69;border-radius:10px;white-space:pre-wrap;font-size:12px;line-height:1.6;display:none;max-width:100%;overflow-wrap:anywhere';
(status?.parentElement||document.body).appendChild(diag);
function showDiagnostic(message){diag.style.display='block';diag.textContent=message;}
function hideDiagnostic(){diag.style.display='none';diag.textContent='';}
window.addEventListener('unhandledrejection',event=>{
 if(String(event.reason?.code||'').startsWith('auth/'))showDiagnostic('登入未處理錯誤：'+event.reason.code+'\n'+(event.reason.message||''));
});
const login=document.getElementById('auth-login');
const logout=document.getElementById('auth-logout');
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const ADMIN_UID='pE9enscLNOUjmSS6sean2mUfaK42';
let unsubscribeTrips=null, knownIds=new Set(), activeAdmin=false, writeQueue=Promise.resolve();
window.cloudSave=(items)=>{
 if(!activeAdmin){alert('只有管理員能儲存');return}
 // 串列化寫入，避免連續編輯互相覆蓋。每次只寫變更的文件。
 const next=items.map(x=>({...x,isPublic:x.isPublic!==false}));
 writeQueue=writeQueue.then(async()=>{
  const batch=writeBatch(db), ids=new Set(next.map(t=>t.id));
  for(const t of next)batch.set(doc(db,'trips',t.id),t);
  for(const id of knownIds)if(!ids.has(id))batch.delete(doc(db,'trips',id));
  await batch.commit();knownIds=ids;
 }).catch(e=>{console.error('Firestore 儲存失敗',e);alert('雲端儲存失敗：'+(e.message||e.code)+'。請重新整理確認資料。')});
};
function watchTrips(user){
 if(unsubscribeTrips){unsubscribeTrips();unsubscribeTrips=null}
 activeAdmin=!!user&&user.uid===ADMIN_UID;
 window.dispatchEvent(new Event('cloud-loading'));
 const q=activeAdmin?collection(db,'trips'):query(collection(db,'trips'),where('isPublic','==',true));
 unsubscribeTrips=onSnapshot(q,snap=>{
  if(snap.metadata.hasPendingWrites)return;
  if(activeAdmin)knownIds=new Set(snap.docs.map(d=>d.id));
  window.dispatchEvent(new CustomEvent('cloud-trips',{detail:{admin:activeAdmin,trips:snap.docs.map(d=>({id:d.id,...d.data()}))}}));
 },e=>{console.error('Firestore 讀取失敗',e);window.dispatchEvent(new CustomEvent('cloud-error',{detail:e.message||e.code}))});
}

const provider=new GoogleAuthProvider();
let loginError=null;
provider.setCustomParameters({prompt:'select_account'});
function errorMessage(error){
 const code=error?.code||'';
 if(code==='auth/popup-closed-by-user')return 'Google 登入視窗已關閉（auth/popup-closed-by-user）。若不是你主動關閉，請檢查瀏覽器的第三方 Cookie／跨網站追蹤限制，並再試一次';
 if(code==='auth/popup-blocked')return '登入視窗遭封鎖，請允許彈出視窗';
 if(code==='auth/unauthorized-domain')return '目前網域未加入 Firebase 授權網域';
 return '登入失敗：'+(code||'unknown')+(error?.message?' — '+error.message:'');
}
login.addEventListener('click',async()=>{
 status.hidden=false;
 showDiagnostic('開始登入檢查…\n網站：'+location.origin+'\nFirebase 專案：'+firebaseConfig.projectId+'\nFirebase Auth 網域：'+firebaseConfig.authDomain+'\n等待 Google 驗證結果…');
 login.disabled=true;status.textContent='正在開啟 Google 登入…';
 try{
  loginError=null;
  const result=await signInWithPopup(auth,provider);
  hideDiagnostic();
 }catch(e){
  console.error('Firebase Google 登入錯誤：',e);
  loginError=errorMessage(e);
  status.textContent=loginError;
  showDiagnostic('登入失敗\n錯誤代碼：'+(e?.code||'unknown')+'\n錯誤內容：'+(e?.message||'無')+'\n網站：'+location.origin+'\n建議：使用 Chrome 無痕視窗測試；確認 Google 登入提供者與授權網域。');
 }
 finally{login.disabled=false}
});
logout.addEventListener('click',async()=>{try{await signOut(auth);hideDiagnostic()}catch(e){status.hidden=false;status.textContent=errorMessage(e)}});
onAuthStateChanged(auth,user=>{
 watchTrips(user);
 login.hidden=!!user;logout.hidden=!user;
 if(user){
  status.hidden=true;hideDiagnostic();
  // Firebase Console → Authentication → 使用者 可複製此 UID。
  console.info('旅色手帳 Firebase 使用者 UID：',user.uid);
 }else{status.hidden=!loginError;status.textContent=loginError||'';hideDiagnostic()}
},e=>{console.error('Firebase 登入狀態錯誤：',e);loginError=errorMessage(e);status.hidden=false;status.textContent=loginError;login.hidden=false});
