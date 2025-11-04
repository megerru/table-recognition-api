# Fly.io 部署指南

## 前置需求

1. **安裝 Fly.io CLI**
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **註冊並登入 Fly.io**
   ```bash
   flyctl auth signup  # 註冊新帳號
   # 或
   flyctl auth login   # 已有帳號
   ```

## 部署步驟

### 1. Clone 你的專案（如果還沒有）
```bash
git clone https://github.com/megerru/table-recognition-api.git
cd table-recognition-api
```

### 2. 創建 Fly.io 應用
```bash
# 使用已有的 fly.toml 配置
flyctl launch --no-deploy

# 或者手動指定應用名稱
flyctl launch --name table-recognition-api --no-deploy
```

系統會問你一些問題：
- "Would you like to set up a PostgreSQL database?" → **No**
- "Would you like to set up an Upstash Redis database?" → **No**
- "Would you like to deploy now?" → **No**（我們先設置好再部署）

### 3. 創建持久化存儲（用於上傳文件）
```bash
flyctl volumes create table_uploads --region nrt --size 1
```

### 4. 調整記憶體（如果需要）
```bash
# 查看目前配置
flyctl scale show

# 調整到 1GB（如果 512MB 不夠用）
flyctl scale memory 1024

# 或 2GB（處理大文件）
flyctl scale memory 2048
```

### 5. 部署應用
```bash
flyctl deploy
```

第一次部署會比較慢（5-10 分鐘），因為要：
- 構建 Docker image
- 下載並快取 ONNX 模型
- 上傳到 Fly.io registry

### 6. 查看部署狀態
```bash
# 查看應用狀態
flyctl status

# 查看日誌
flyctl logs

# 查看即時日誌
flyctl logs -f
```

### 7. 測試應用
```bash
# 打開應用
flyctl open

# 測試 Health Check
curl https://table-recognition-api.fly.dev/api/health
```

## 更新應用

當你修改代碼後：

```bash
# 1. Commit 你的變更
git add .
git commit -m "Update something"
git push

# 2. 重新部署
flyctl deploy
```

## 監控與管理

### 查看資源使用
```bash
flyctl dashboard
```

### 查看應用日誌
```bash
# 最近 100 條
flyctl logs

# 即時監控
flyctl logs -f
```

### SSH 進入容器
```bash
flyctl ssh console
```

### 重啟應用
```bash
flyctl apps restart table-recognition-api
```

## 成本估算

### 免費額度（每月）
- 3 個共享 CPU-1x 256MB VM
- 160GB 流量

### 你的配置（512MB）
- **免費**（在免費額度內）

### 如果升級到 1GB
- 約 **$2-5/月**（取決於運行時間）

### 如果升級到 2GB
- 約 **$10-15/月**

### 節省成本技巧
```toml
# fly.toml 中已配置自動暫停/啟動
auto_stop_machines = true
auto_start_machines = true
min_machines_running = 0
```

這樣無人使用時會自動暫停，節省費用。

## 常見問題

### 1. 部署失敗："Out of memory"
```bash
# 升級記憶體
flyctl scale memory 1024
flyctl deploy
```

### 2. ONNX 模型下載失敗
Dockerfile 已經預載入模型，如果還是失敗：
```bash
# 增加構建超時
flyctl deploy --build-arg TIMEOUT=1800
```

### 3. PDF 轉圖片失敗
檢查 poppler-utils 是否正確安裝：
```bash
flyctl ssh console
which pdftoppm
```

### 4. 上傳的文件消失
確保 Volume 正確掛載：
```bash
flyctl volumes list
flyctl ssh console -C "ls -la /app/uploads"
```

### 5. 應用啟動慢
第一次啟動需要加載 ONNX 模型（約 10-30 秒），這是正常的。

## 環境變數（如果需要）

```bash
# 設置環境變數
flyctl secrets set API_KEY=your_secret_key

# 查看已設置的 secrets
flyctl secrets list
```

## 回滾到上一個版本

```bash
# 查看部署歷史
flyctl releases

# 回滾到上一個版本
flyctl releases rollback
```

## 刪除應用

```bash
# 刪除應用（包括 Volume）
flyctl apps destroy table-recognition-api
```

## 進階配置

### 多區域部署（高可用性）
```bash
# 添加美國西岸
flyctl scale count 2 --region sjc

# 添加歐洲
flyctl scale count 3 --region lhr
```

### 自定義域名
```bash
flyctl certs add yourdomain.com
```

## 監控警報

在 Fly.io Dashboard 設置：
- 記憶體使用超過 80%
- CPU 使用超過 90%
- HTTP 5xx 錯誤

## 支援

- 官方文檔：https://fly.io/docs
- 社群論壇：https://community.fly.io
- 你的應用：https://fly.io/apps/table-recognition-api
