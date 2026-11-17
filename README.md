# 標點符號數位寫作坊

沿用 GitHub Pages 原網址，由同一個 Supabase 專案提供 Realtime 共作同步與 Gemini AI 診斷，不需 Vercel。學生不需輸入 Gemini API Key。

## 啟用 AI

1. Supabase 專案：writing-workshop（rvkmzllnphhbnaxfvkbz）。
2. 部署 supabase/functions/writing-diagnose/，函式名稱為 writing-diagnose。
3. 在 Supabase Dashboard → Edge Functions → Secrets 新增 GEMINI_API_KEY，值填入有效的 Gemini API Key。
4. 可選填 GEMINI_MODEL；預設沿用原站 gemini-3-flash-preview。模型可用性取決於 Google 帳號；若已停用，填入 AI Studio 中可用的模型 ID。
5. 開啟 https://qaz0926-afk.github.io/writing-workshop/，輸入作品後點 AI 診斷。

函式使用非 JWT 的 publishable key，因此 verify_jwt=false，由函式自行核對 apikey。GEMINI_API_KEY 只放在 Supabase Secrets，請勿填入 GitHub、HTML 或對話。

## 架構

- index.html、writing.html：原有網站及多人同步程式，AI 請求傳送至 SUPABASE_URL/functions/v1/writing-diagnose。
- Supabase Realtime：保留原本房間、文字與狀態同步。
- Supabase Edge Function：固定教學提示、作品限制 6000 字／請求 32 KiB、輸出及時間限制，隱藏上游錯誤。
- Gemini 暫時無法使用時，自動切換原本離線指引，並顯示提示。

## 使用範圍

只允許 GitHub Pages 來源的瀏覽器跨站請求，並核對既有公開 publishable key。這些措施不等同學生身分驗證，也不能阻擋模擬來源的直接呼叫。此版本仍為原有公開網站，未加入登入、持久化配額或完整濫用防護；金鑰保密不代表無法被消耗額度。啟用付費額度前，應再規劃登入與伺服器端配額。

AI 回饋只保留基本文字排版，移除 HTML 屬性；金鑰、服務角色金鑰與上游錯誤不會回傳瀏覽器。

## 驗證

node --test tests/diagnose.test.mjs

本機測試模擬 Gemini，驗證跨站預檢、來源與 app key、輸入限制、成功與失敗、秘密不外洩及兩頁語法。真實 AI 回覆需有效的 GEMINI_API_KEY 才能測試。
