// 第一階段：僅啟用 Firebase Google 登入以取得 UID，不改變原有本機資料與編輯權限。
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCxc6LEdv7M6IImqGFrSJwgBUt5D3-ISYg',
  authDomain: 'travel-journal-af628.firebaseapp.com',
  projectId: 'travel-journal-af628',
  storageBucket: 'travel-journal-af628.firebasestorage.app',
  messagingSenderId: '177806311533',
  appId: '1:177806311533:web:20281d990d1d75f34d7f64'
};
const status=document.getElementById('auth-status');
const login=document.getElementById('auth-login');
const logout=document.getElementById('auth-logout');
const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
function errorMessage(error){
 const code=error?.code||'';
 if(code==='auth/popup-closed-by-user')return '已取消登入';
 if(code==='auth/popup-blocked')return '登入視窗遭封鎖，請允許彈出視窗';
 if(code==='auth/unauthorized-domain')return '目前網域未加入 Firebase 授權網域';
 return '登入失敗：'+(code||'請稍後重試');
}
login.addEventListener('click',async()=>{
 login.disabled=true;status.textContent='正在開啟 Google 登入…';
 try{await signInWithPopup(auth,provider)}catch(e){status.textContent=errorMessage(e)}
 finally{login.disabled=false}
});
logout.addEventListener('click',async()=>{try{await signOut(auth)}catch(e){status.textContent=errorMessage(e)}});
onAuthStateChanged(auth,user=>{
 login.hidden=!!user;logout.hidden=!user;
 if(user){
  status.textContent='已登入：'+(user.displayName||user.email||'Google 使用者');
  // Firebase Console → Authentication → 使用者 可複製此 UID。
  console.info('旅色手帳 Firebase 使用者 UID：',user.uid);
 }else{status.textContent='尚未登入 Firebase'}
},e=>{status.textContent=errorMessage(e);login.hidden=false});
