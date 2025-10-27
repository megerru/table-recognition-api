# 部署檢查清單

## ✅ 部署前準備

- [ ] 確認 Replit 應用可以正常運行
- [ ] 測試上傳 PDF 功能
- [ ] 測試表格識別功能
- [ ] 檢查所有 API 端點正常工作

## 🚀 Replit 部署

- [ ] 點擊 Replit 的 "Publish" 按鈕
- [ ] 選擇 "Deploy" 
- [ ] 記錄部署後的 URL：`___________________________`
- [ ] 測試部署後的 API 是否可訪問

## 📄 前端頁面配置

- [ ] 下載 `table-recognition.html`
- [ ] 修改第 367 行的 `API_BASE_URL`
- [ ] 替換為實際的 Replit 部署 URL
- [ ] 儲存文件

## 📤 上傳到 GitHub

- [ ] 將 `table-recognition.html` 添加到 GitHub Pages 倉庫
- [ ] 提交更改 (git commit)
- [ ] 推送到 GitHub (git push)
- [ ] 等待 GitHub Pages 部署完成（約 1-5 分鐘）

## 🔗 添加導航連結

在您的主頁添加連結（可選）：

```html
<!-- 在適當的位置添加 -->
<a href="table-recognition.html">
    <div class="tool-card">
        <h3>📊 表格識別工具</h3>
        <p>上傳 PDF，自動識別表格內容</p>
    </div>
</a>
```

## 🧪 測試集成

- [ ] 訪問 `https://megerru.github.io/table-recognition.html`
- [ ] 測試上傳 PDF
- [ ] 測試表格識別
- [ ] 測試匯出 CSV 功能
- [ ] 測試複製功能
- [ ] 在不同瀏覽器測試（Chrome、Safari、Firefox）
- [ ] 在手機上測試響應式設計

## ⚠️ 常見問題檢查

### CORS 錯誤
- [ ] 確認 `server/index.ts` 中包含 `https://megerru.github.io`
- [ ] 重新部署 Replit 應用

### API 無回應
- [ ] 檢查 Replit 應用狀態
- [ ] 檢查 API_BASE_URL 是否正確
- [ ] 查看瀏覽器網路請求

### 表格識別失敗
- [ ] 確認 PDF 文件品質
- [ ] 檢查 Replit 應用日誌
- [ ] 嘗試不同的 PDF 文件

## 📊 效能優化（可選）

- [ ] 壓縮圖片資源
- [ ] 啟用快取策略
- [ ] 監控 API 回應時間
- [ ] 考慮添加載入進度條

## 🎉 部署完成

- [ ] 確認所有功能正常運作
- [ ] 通知使用者新功能上線
- [ ] 準備使用者說明文檔
- [ ] 收集使用者反饋

---

**部署日期：** _______________

**部署人員：** _______________

**Replit URL：** _______________

**GitHub Pages URL：** https://megerru.github.io/table-recognition.html
