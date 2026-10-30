旅色手帳｜Firestore 雲端同步版

1. 將 index.html、app.js、style.css、firebase-auth.js 上傳 GitHub Pages 專案根目錄。
2. 使用管理員 Google 帳號登入，即可新增行程；預設公開，朋友免登入可看。
3. 行程卡片上的「設為私人／設為公開」可切換可見性。
4. 訪客無法編輯；Firestore 安全規則必須已部署。
5. 本版本不會自動匯入舊 localStorage 資料，也不會刪除舊資料。
6. 請先建立測試行程，另一個無痕視窗確認公開可見、私人不可見。
7. 本版每次儲存會同步整份行程清單，適合少量個人行程（Firestore 單次批次最多 500 筆寫入）。
