# Changelog 2025-11-20

## 🚀 重大架構更新：常駐 Python 伺服器

為了解決 Fly.io 部署時的超時 (Timeout) 和記憶體不足 (OOM) 問題，我們對後端架構進行了重大重構。

### 核心變更

- **Python 架構重構**：
  - 廢棄了「每次請求啟動新進程」的模式。
  - 引入 `Flask` 框架，將 Python 腳本轉換為常駐 HTTP 伺服器。
  - 實現了模型全域預加載（Global Preloading），只需在啟動時加載一次模型，後續請求可直接推理。

- **Node.js 後端更新**：
  - `server/index.ts`：新增了自動管理 Python 子進程的邏輯（啟動與優雅關閉）。
  - `server/routes.ts`：將原本的 `spawn` 調用改為高效的 HTTP `fetch` 請求。

- **依賴項更新**：
  - 新增 `flask` (Web 框架)。
  - 新增 `gunicorn` (Linux 生產環境 WSGI 伺服器)。
  - 新增 `waitress` (Windows 開發環境 WSGI 伺服器)。

### 預期效益

- **效能提升**：API 響應速度預計提升 5-10 倍（省去了模型加載時間）。
- **穩定性**：消除了因並發請求導致的多重模型加載，大幅降低記憶體峰值。
- **部署友善**：更適合 Fly.io 等 Serverless/Container 環境。
