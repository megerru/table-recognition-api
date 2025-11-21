# Changelog 2025-11-20 (Rollback to Version 14)

## ↩️ 回滾到版本 14

### 問題分析
經過多次嘗試後發現：
- **版本 15+**：引入了 Flask 持久化伺服器，但存在 GPU 相關錯誤和記憶體管理問題
- **版本 14**：使用穩定的 spawn 方式執行 Python 腳本，雖然較慢但非常穩定

### 回滾內容
- **Git Commit**: `6034680` - "fix: Improve mobile UX and table recognition accuracy"
- **架構**: 使用 `spawn` 方式執行 Python 腳本（每次請求重新載入模型）
- **記憶體**: 恢復到 1GB（原始配置）
- **優點**: 穩定、可靠
- **缺點**: 每次請求需要重新載入模型（較慢）

### 部署資訊
- **映像**: `registry.fly.io/table-recognition-api:deployment-01KAG0BRXEK2E9WJG3A1RMG4B5`
- **部署時間**: 2025-11-20 14:48
- **狀態**: ✅ 成功部署

### 後續建議
如果需要提升性能，建議：
1. 保持當前穩定版本運行
2. 在開發環境中修復 Flask 伺服器版本的問題
3. 充分測試後再部署 Flask 版本
