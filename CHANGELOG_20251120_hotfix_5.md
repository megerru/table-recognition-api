# Changelog 2025-11-20 (Hotfix 5)

## 🔧 錯誤修復：ONNX Runtime GPU 錯誤

### 問題描述
-   **GPU 偵測失敗**：日誌顯示 `[W:onnxruntime:Default, device_discovery.cc:164] GPU device discovery failed`。
-   **原因**：Fly.io 的標準 VM 是純 CPU 環境，但 ONNX Runtime 嘗試尋找 GPU，導致警告甚至潛在的初始化失敗或卡頓。

### 修復內容
-   **強制 CPU 模式**：在 `server/table_recognition.py` 中設置環境變數 `CUDA_VISIBLE_DEVICES='-1'` 和 `ORT_TENSORRT_ENGINE_CACHE_ENABLE='0'`。
-   **效果**：這會告訴底層庫不要嘗試尋找或使用 GPU，直接使用 CPU 進行運算，消除警告並提高穩定性。

### 驗證
-   部署後，日誌中應不再出現 `GPU device discovery failed` 的警告。
-   服務應能正常啟動並執行表格識別。
