# Changelog 2025-11-20 (Hotfix 2)

## 🐛 錯誤修復：切換至 Waitress 生產伺服器

### 問題描述
1.  **Gunicorn 啟動失敗**：嘗試從 Node.js 直接生成 `gunicorn` 進程導致 `fetch failed` 和 `UND_ERR_SOCKET` 錯誤。
2.  **開發伺服器警告**：原先使用 `app.run()` 會在生產環境日誌中顯示警告。

### 修復內容
- **回滾 Node.js 變更**：`server/index.ts` 恢復為簡單的 `python table_recognition.py` 啟動方式，確保穩定性。
- **Python 內部切換伺服器**：修改 `server/table_recognition.py`，在檢測到非 Windows 環境或 `NODE_ENV=production` 時，自動使用 `waitress.serve()` 啟動生產級 WSGI 伺服器。

### 驗證
- 部署後，應用程式應不再顯示開發伺服器警告。
- 服務應能正常處理請求，無連接錯誤。
