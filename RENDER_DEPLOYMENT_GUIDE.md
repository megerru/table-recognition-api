# Render 免費部署指南

## 🎉 完全免費部署您的表格識別 API

本指南將幫助您在 Render 免費方案上部署表格識別工具。

---

## 📋 前置準備

### 1. 註冊 Render 帳號
1. 訪問 [https://render.com](https://render.com)
2. 使用 GitHub 帳號註冊（推薦）
3. 完成帳號驗證

### 2. 準備 GitHub 倉庫
您需要將這個專案上傳到 GitHub：

```bash
# 初始化 git（如果還沒有）
git init

# 添加所有檔案
git add .

# 提交
git commit -m "Initial commit for table recognition API"

# 創建 GitHub 倉庫後，連接並推送
git remote add origin https://github.com/YOUR_USERNAME/table-recognition-api.git
git branch -M main
git push -u origin main
```

---

## 🚀 在 Render 上部署

### 步驟 1：創建新的 Web Service

1. 登入 [Render Dashboard](https://dashboard.render.com/)
2. 點擊 **"New +"** 按鈕
3. 選擇 **"Web Service"**

### 步驟 2：連接 GitHub 倉庫

1. 選擇 **"Connect a repository"**
2. 授權 Render 訪問您的 GitHub
3. 選擇您剛才創建的倉庫

### 步驟 3：配置部署設定

填寫以下資訊：

#### 基本設定
- **Name**: `table-recognition-api`（或任何您喜歡的名稱）
- **Region**: 選擇最接近您的區域（例如：Singapore）
- **Branch**: `main`
- **Root Directory**: 留空

#### 環境設定
- **Environment**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build && pip3 install -r render-requirements.txt
  ```
- **Start Command**: 
  ```bash
  npm run start
  ```

#### 方案選擇
- **Instance Type**: 選擇 **"Free"** 方案 ⭐

### 步驟 4：設定環境變數

點擊 **"Advanced"**，添加環境變數：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |

### 步驟 5：部署

1. 點擊 **"Create Web Service"**
2. 等待部署完成（首次部署約需 5-10 分鐘）
3. 部署完成後，您會獲得一個 URL，類似：
   ```
   https://table-recognition-api.onrender.com
   ```

---

## ✅ 驗證部署

### 測試 API

使用瀏覽器或 curl 測試：

```bash
# 檢查服務是否運行
curl https://your-app.onrender.com/

# 應該返回網頁或 API 回應
```

### 常見問題排除

#### ❌ 部署失敗

**檢查日誌：**
1. 在 Render Dashboard 中點擊您的服務
2. 查看 **"Logs"** 標籤
3. 尋找錯誤訊息

**常見錯誤：**

1. **Python 依賴安裝失敗**
   - 確認 `render-requirements.txt` 檔案存在
   - 檢查 Python 套件版本是否正確

2. **Build Command 失敗**
   - 確認 `package.json` 有 `build` 和 `start` 腳本
   - 檢查 Node.js 版本相容性

3. **Start Command 失敗**
   - 確認 `dist/index.js` 檔案存在
   - 檢查環境變數設定

#### ⏰ 服務休眠

**Render 免費方案特性：**
- 15 分鐘無活動後會自動休眠
- 下次請求時會自動喚醒（約需 30 秒）
- 這是正常現象，不影響功能

**解決方案：**
- 接受這個限制（完全免費）
- 或升級到付費方案（$7/月起）

---

## 🔧 更新前端配置

部署成功後，更新您的 `table-recognition.html`：

```javascript
// 第 367 行
const API_BASE_URL = 'https://your-app.onrender.com';  // 替換為您的 Render URL
```

上傳到 GitHub Pages 並測試！

---

## 📊 免費方案限制

✅ **包含內容：**
- 750 小時/月運行時間（足夠個人使用）
- 512 MB RAM
- 自動 HTTPS
- 自動重新部署（當您推送到 GitHub）

⚠️ **限制：**
- 15 分鐘無活動後休眠
- 每月 100 GB 流量限制
- CPU 和記憶體限制

對於個人工具來說，這些限制完全足夠！

---

## 🔄 自動部署

連接 GitHub 後，每次您推送代碼到 main 分支，Render 都會自動重新部署！

```bash
# 修改代碼後
git add .
git commit -m "Update feature"
git push

# Render 會自動檢測並重新部署
```

---

## 🎯 完整流程總結

1. ✅ 將專案推送到 GitHub
2. ✅ 在 Render 創建 Web Service
3. ✅ 選擇免費方案
4. ✅ 配置 Build 和 Start 命令
5. ✅ 等待部署完成
6. ✅ 獲得免費 API URL
7. ✅ 更新前端 `table-recognition.html`
8. ✅ 上傳到 GitHub Pages
9. ✅ 完成！🎉

---

## 💡 專業提示

### 保持服務活躍

如果您不想等待喚醒時間，可以：

1. **使用 Uptime Robot**（免費）
   - 網址：https://uptimerobot.com
   - 設置每 5 分鐘 ping 一次您的 API
   - 防止服務休眠

2. **使用 Cron-job.org**（免費）
   - 網址：https://cron-job.org
   - 定期訪問您的 API
   - 保持服務活躍

### 監控服務

- 在 Render Dashboard 查看服務狀態
- 設置通知以獲取部署更新
- 查看日誌排除問題

---

## 🆘 需要幫助？

遇到問題？檢查：
1. Render Dashboard 的日誌
2. GitHub Actions（如果有設置）
3. 瀏覽器開發者工具的網路請求

---

**恭喜！您現在有了一個完全免費的表格識別 API！** 🎊
