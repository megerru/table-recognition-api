# Changelog 2025-11-20 (Hotfix)

## 🐛 錯誤修復：修復 Docker 映像檔依賴缺失

### 問題描述
部署後出現 `ECONNREFUSED` 錯誤，原因是 `Dockerfile` 使用了硬編碼的 `pip install` 命令，未能包含新引入的 `flask`、`gunicorn` 和 `waitress` 依賴，導致 Python 伺服器無法啟動。

### 修復內容
- **Dockerfile 更新**：
  - 在 `python-deps` 和 `production` 階段手動添加了 `flask`、`gunicorn` 和 `waitress`。

### 驗證
- 重新部署後，Python 伺服器應能正常啟動並監聽端口，Node.js 後端應能成功連接。
