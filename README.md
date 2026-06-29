# AI 數據分析與洞察工具 (AI CSV Analyzer)

這是一個基於 Next.js 15 與 Google Gemini 3.5 Flash 的獨立 Web 數據分析應用程式。你可以上傳或貼上 CSV 報表資料，智慧生成全方位數據分析報告與互動對話洞察。

## 🚀 本地開發與執行 (Run Locally)

### 1. 安裝套件依賴 (Install Dependencies)
```bash
npm install
```

### 2. 設定環境變數 (Environment Variables)
在專案根目錄建立 `.env.local` 檔案，並填入你的 Google Gemini API Key：
```env
GEMINI_API_KEY="你的_GEMINI_API_KEY_字串"
```

### 3. 啟動開發伺服器 (Start Dev Server)
```bash
npm run dev
```
啟動後在瀏覽器開啟 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 📦 生產環境打包與部署 (Build & Deploy)

### 打包與測試生產版本
```bash
npm run build
npm run start
```

### 部署至常見雲端平台
* **Vercel / Netlify / Zeabur**：將此專案推送到 GitHub 後直接匯入，並在平台後台的 **Environment Variables** 新增 `GEMINI_API_KEY` 即可一鍵部署完成。
* **Docker / Node 伺服器**：支援標準 Next.js 伺服器部署方式。

