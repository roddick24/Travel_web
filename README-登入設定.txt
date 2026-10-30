旅色手帳｜Firebase Google 登入：第一階段

1. 備份原本 GitHub / VS Code 的程式碼。
2. 將 index.html、style.css、app.js、firebase-auth.js 上傳 GitHub Travel_web 根目錄。
3. 等 GitHub Pages 部署完成，開啟 https://roddick24.github.io/Travel_web/
4. 點右上角「使用 Google 登入」，選自己的 Google 帳號。
5. Firebase Console → Authentication → 使用者，找到新登入帳號並複製「使用者 UID」。
6. 下一步再設定 Firestore Security Rules、資料搬移與唯讀模式。

重要：這是第一階段的「登入與取得 UID」版本。
- 原有行程仍存於瀏覽器 localStorage，未上傳 Firestore，朋友還無法看到你的行程。
- 目前原有編輯功能仍對所有開啟網站的人可見，但他們只會編輯各自的 localStorage。
- Google 登入成功不代表已實施管理員權限；必須完成下一階段的 Firestore 規則才有真正的唯讀保護。
- 切勿將 Google 密碼或 Firebase 服務帳戶私鑰貼到 GitHub。
- 網頁必須使用 HTTPS GitHub Pages 或 localhost 開啟，不能用 file:// 直接開啟。
