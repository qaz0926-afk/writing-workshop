# 標點符號數位寫作坊

學生不需輸入 API Key；AI 診斷由 Vercel 後端呼叫 Gemini。畫面和離線檢核保留。

## 部署

1. 在 Vercel 新增專案，匯入本 GitHub 儲存庫，Framework Preset 選 Other；不需 Build Command，Output Directory 使用預設值。
2. 新增伺服器環境變數 GEMINI_API_KEY，值填入自己的 Gemini API Key；不要使用 NEXT_PUBLIC_ 或 VITE_ 前綴。
3. 可選填 GEMINI_MODEL，預設沿用原站的 gemini-3-flash-preview。模型可用性取決於 Google 帳號；若模型已停用，改填 AI Studio 中可用的模型 ID。
4. 部署後使用 Vercel 網址，輸入作品並按 AI 診斷。若部署後才新增變數，請 Redeploy。

GitHub Pages 無法執行 api/diagnose.js；原 GitHub Pages 網址只會使用離線檢核。請分享新的 Vercel 網址。

## 金鑰與使用範圍

金鑰僅由後端環境變數讀取，不放入 HTML、Git 或瀏覽器。後端固定使用寫作教學提示，限制作品最多 6000 字及回覆長度，拒絕瀏覽器跨站請求，且不傳回上游錯誤內容。AI 回饋以允許清單移除 HTML 屬性與主動內容。

此版本未加入登入或持久化使用配額；公開網站的後端仍可能被直接呼叫。同源檢查不能代替存取驗證。若需限制全班使用或啟用付費額度，應先加入學生登入與伺服器端配額。

## 驗證

執行 node --test tests/diagnose.test.js。測試以模擬 Gemini 回覆驗證，不需真實金鑰。實際 Gemini 回饋仍需部署後填入有效金鑰測試。
