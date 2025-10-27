# 🚀 GitHub Pages 部署指南

## ✅ 已完成配置

您的 `table-recognition.html` 已經配置完成，API 地址指向：
```
https://workspace.megerru.repl.co
```

---

## 📤 上傳到 GitHub Pages

### 方法 1：直接上傳（推薦，最簡單）

1. **下載檔案**
   - 在 Replit 左側文件列表中找到 `table-recognition.html`
   - 右鍵點擊 → "Download"

2. **上傳到 GitHub**
   - 前往您的 GitHub 倉庫：https://github.com/megerru/megerru.github.io
   - 點擊 "Add file" → "Upload files"
   - 拖曳 `table-recognition.html` 上傳
   - 填寫提交訊息（例如："Add table recognition tool"）
   - 點擊 "Commit changes"

3. **訪問工具**
   - 等待 1-2 分鐘
   - 訪問：https://megerru.github.io/table-recognition.html
   - ✅ 完成！

---

### 方法 2：使用 Git 命令

如果您習慣使用 Git：

```bash
# 1. 下載 table-recognition.html 到本地電腦
# 2. 進入您的 GitHub Pages 倉庫目錄
cd /path/to/megerru.github.io

# 3. 複製檔案到倉庫
cp /path/to/table-recognition.html .

# 4. 提交並推送
git add table-recognition.html
git commit -m "Add table recognition tool"
git push origin main
```

---

## 🔗 添加到您的網站導航

在您的主頁 `index.html` 中添加連結：

```html
<a href="table-recognition.html">📊 表格識別工具</a>
```

---

## ⚠️ 重要提醒

### Replit 應用狀態
- ✅ **免費使用**：完全免費
- ⏸️ **自動休眠**：15 分鐘無活動後會休眠
- ⏱️ **喚醒時間**：首次訪問需等待 5-10 秒
- 💡 **升級選項**：Replit Always On ($7/月) 保持 24/7 運行

### 使用流程
1. 用戶訪問 https://megerru.github.io/table-recognition.html
2. 首次訪問可能需要等待幾秒（喚醒 Replit 應用）
3. 之後 15 分鐘內都會快速響應
4. 超過 15 分鐘無人使用，再次訪問需要重新喚醒

---

## 🎉 大功告成！

上傳後，您的表格識別工具就可以在您的個人網站上使用了！

**測試連結**：https://megerru.github.io/table-recognition.html
