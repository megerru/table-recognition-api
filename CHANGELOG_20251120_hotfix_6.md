# Changelog 2025-11-20 (Hotfix 6)

## 🚑 緊急修復：Python 伺服器崩潰

### 問題描述
-   **症狀**：API 請求失敗，日誌顯示 `SocketError: other side closed` 或 `TypeError: fetch failed`。
-   **原因**：在之前的重構中，`server/table_recognition.py` 中的輔助函數 `parse_html_table` 和 `clean_table_data` 意外丟失，導致 Python 伺服器在處理請求時因 `NameError` 而崩潰。此外，缺少 `beautifulsoup4` 依賴。

### 修復內容
1.  **恢復輔助函數**：在 `server/table_recognition.py` 中重新實現了 `parse_html_table` 和 `clean_table_data`。
2.  **添加依賴**：
    -   在 `pyproject.toml` 中添加 `beautifulsoup4`。
    -   在 `Dockerfile` 中添加 `beautifulsoup4` 安裝步驟。

### 驗證
-   部署後，`/recognize` 請求應能正常完成，不再導致伺服器崩潰。
