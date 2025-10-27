# 表格識別工具集成指南

## 📋 概述

這份指南將幫助您將表格識別 API 集成到您的 GitHub Pages 網站 (https://megerru.github.io/)

## 🚀 部署步驟

### 1. 部署 Replit 應用

1. 在 Replit 中點擊右上角的 **"Publish"** 按鈕
2. 選擇 **"Deploy"** 部署您的應用
3. 部署完成後，您會獲得一個公開的 URL，類似：
   ```
   https://your-project-name.replit.app
   ```
4. **記下這個 URL**，稍後需要用到

### 2. 將頁面添加到您的 GitHub Pages

#### 方法 A：直接添加到現有網站

1. 下載本專案中的 `table-recognition.html` 文件
2. 打開文件，找到第 367 行：
   ```javascript
   const API_BASE_URL = 'YOUR_REPLIT_APP_URL_HERE';
   ```
3. 將 `YOUR_REPLIT_APP_URL_HERE` 替換為您的 Replit 部署 URL：
   ```javascript
   const API_BASE_URL = 'https://your-project-name.replit.app';
   ```
4. 將修改後的 `table-recognition.html` 上傳到您的 GitHub Pages 倉庫
5. 提交並推送更改到 GitHub

#### 方法 B：在您的主頁添加連結

在您的 `index.html` 中添加一個導航連結：

```html
<a href="table-recognition.html">📊 表格識別工具</a>
```

### 3. 測試集成

1. 訪問 `https://megerru.github.io/table-recognition.html`
2. 上傳一個包含表格的 PDF 文件
3. 檢查是否能正常識別表格

## 🔧 技術細節

### API 端點

這個應用提供以下 API 端點：

#### 1. 上傳並預覽 PDF
```
POST /api/upload-preview
Content-Type: multipart/form-data

參數：
  - file: PDF 文件

回應：
{
  "success": true,
  "sessionId": "...",
  "pages": [...]
}
```

#### 2. 獲取預覽圖片
```
GET /api/preview-image/:sessionId/:pageIndex

回應：
  - PNG 圖片
```

#### 3. 識別表格
```
POST /api/recognize-regions
Content-Type: application/json

參數：
{
  "sessionId": "..."
}

回應：
{
  "success": true,
  "tables": [
    {
      "tableIndex": 0,
      "pageNumber": 1,
      "rows": [["cell1", "cell2"], ...],
      "confidence": 0.9,
      "type": "wired"
    }
  ]
}
```

### CORS 配置

API 已配置允許以下來源訪問：
- `https://megerru.github.io`
- `http://localhost:3000`
- `http://localhost:5000`

## 🎨 自定義樣式

您可以修改 `table-recognition.html` 中的 CSS 來匹配您網站的設計風格：

```css
/* 主色調 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 按鈕顏色 */
.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 📱 功能特性

- ✅ 拖放上傳 PDF
- ✅ 多頁 PDF 支援
- ✅ 自動識別有框線/無框線表格
- ✅ 表格預覽和編輯
- ✅ 匯出 CSV
- ✅ 複製到剪貼簿
- ✅ 響應式設計

## 🐛 故障排除

### 問題：CORS 錯誤

**解決方案：** 確保您的 GitHub Pages URL (`https://megerru.github.io`) 已添加到 `server/index.ts` 的 CORS 允許列表中。

### 問題：無法識別表格

**可能原因：**
1. PDF 圖片質量太低
2. 表格格式不標準
3. PDF 是掃描件而非原生 PDF

**解決方案：** 嘗試使用更清晰的 PDF 文件

### 問題：部署後 API 無法訪問

**解決方案：** 
1. 檢查 Replit 部署狀態
2. 確認 API_BASE_URL 設置正確
3. 檢查瀏覽器控制台是否有錯誤訊息

## 📝 後續維護

### 更新 API

如果您修改了 Replit 應用的代碼：
1. 重新部署應用
2. 無需修改前端代碼（除非 API 接口變更）

### 添加新功能

您可以在 `table-recognition.html` 中添加：
- 更多匯出格式（Excel、JSON 等）
- 表格編輯功能
- 批次處理多個 PDF
- 數據驗證和校正

## 💡 使用提示

1. **最佳 PDF 品質**：使用高解析度、清晰的 PDF 文件
2. **表格格式**：標準的行列表格識別效果最好
3. **文件大小**：建議單個 PDF 不超過 10MB

## 📞 技術支援

如遇問題，請檢查：
1. Replit 應用日誌
2. 瀏覽器開發者工具的網路請求
3. 瀏覽器控制台錯誤訊息

---

© 2024 表格識別工具 - Powered by Replit
