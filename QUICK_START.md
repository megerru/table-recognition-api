# 🚀 快速開始 - Render 免費部署

## 3 步驟完成部署

### 步驟 1：推送到 GitHub（5 分鐘）

```bash
# 1. 初始化 Git（如果還沒有）
git init

# 2. 添加檔案
git add .

# 3. 提交
git commit -m "Initial commit"

# 4. 在 GitHub 創建新倉庫，然後執行：
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 步驟 2：在 Render 部署（3 分鐘設置，10 分鐘等待）

1. 訪問 https://render.com 並註冊
2. 點擊 **"New +"** → **"Web Service"**
3. 連接您的 GitHub 倉庫
4. 配置：
   - **Name**: `table-recognition-api`
   - **Environment**: `Node`
   - **Build Command**: 
     ```
     npm install && npm run build && pip3 install -r render-requirements.txt
     ```
   - **Start Command**: 
     ```
     npm run start
     ```
   - **Plan**: 選擇 **Free** ⭐
5. 點擊 **"Create Web Service"**
6. 等待部署完成（約 5-10 分鐘）
7. 複製您的 URL（例如：`https://your-app.onrender.com`）

### 步驟 3：更新前端並上傳到 GitHub Pages（2 分鐘）

1. 打開 `table-recognition.html`
2. 找到第 367 行，修改：
   ```javascript
   const API_BASE_URL = 'https://your-app.onrender.com';  // 改成您的 Render URL
   ```
3. 上傳到您的 GitHub Pages 倉庫
4. 訪問 `https://megerru.github.io/table-recognition.html`
5. 測試上傳 PDF！

## ✅ 完成！

您現在有了：
- ✨ 完全免費的 API
- 🚀 自動部署（推送代碼就自動更新）
- 🔒 免費 HTTPS
- 📊 表格識別功能

## ⚠️ 重要提示

**首次訪問：** Render 免費方案會在 15 分鐘無活動後休眠，首次訪問需等待約 30 秒喚醒。

**解決方案：** 使用 [Uptime Robot](https://uptimerobot.com) 每 5 分鐘 ping 一次，保持服務活躍（也是免費的）。

---

需要詳細說明？查看 `RENDER_DEPLOYMENT_GUIDE.md`
