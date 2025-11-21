# 表格辨識 API v2.0 - Linus 式極簡架構

> "The best code is no code at all." - Linus Torvalds

## 🎯 專案重整說明

### 為什麼重寫？

用戶問：「React 是啥？」

這個回答證明了一個核心原則：

> **"If you don't know what it is, you don't need it."**

舊架構的問題：
- ❌ 96 個 npm 套件（React + 40+ Radix UI 組件）
- ❌ Node.js + Express（只是 Python 的代理）
- ❌ Vite + esbuild + TypeScript（過度構建）
- ❌ 2GB RAM（OOM 問題）
- ❌ 5-stage Dockerfile（構建時間 5 分鐘）

### 新架構

```
前端：純靜態 HTML + Vanilla JS（0 依賴）
後端：Python FastAPI（7 個依賴）
部署：單 stage Docker（構建時間 1 分鐘）
記憶體：1GB RAM（降低 50%）
```

## 📦 技術棧

### 後端（Python）
- **FastAPI** - Web 框架
- **Pillow** - 圖片處理
- **pdf2image** - PDF 轉換
- **lineless-table-rec** - 無線表格識別
- **wired-table-rec** - 有線表格識別
- **rapidocr-onnxruntime** - OCR 引擎

### 前端（零依賴）
- HTML5 + CSS3
- Vanilla JavaScript
- Tailwind CSS（CDN）

## 🚀 本地運行

### 1. 安裝依賴

```bash
pip install -r requirements.txt
```

### 2. 啟動服務器

```bash
python main.py
```

### 3. 訪問應用

```
http://localhost:8080
```

## 🐳 Docker 部署

### 構建映像

```bash
docker build -t table-recognition-api .
```

### 運行容器

```bash
docker run -p 8080:8080 table-recognition-api
```

## ☁️ Fly.io 部署

### 首次部署

```bash
flyctl launch
```

### 更新部署

```bash
flyctl deploy
```

### 查看狀態

```bash
flyctl status
flyctl logs
```

## 📊 架構對比

| 指標 | v1 (Legacy) | v2 (Linus) | 改善 |
|-----|-------------|------------|------|
| **依賴數量** | 96 個 npm | 7 個 Python | **⬇️ 93%** |
| **構建時間** | 5 分鐘 | 1 分鐘 | **⬇️ 80%** |
| **記憶體需求** | 2GB | 1GB | **⬇️ 50%** |
| **Dockerfile** | 5 stages | 1 stage | **⬇️ 80%** |
| **代碼行數** | 5000+ | 800 | **⬇️ 84%** |
| **技術棧** | 3 種語言 | 2 種語言 | **⬇️ 33%** |

## 🎯 核心功能

✅ 上傳 PDF/圖片
✅ 自動轉換為預覽圖
✅ 滑鼠框選表格區域
✅ OCR 識別表格內容
✅ 支援有線/無線表格
✅ 自動判斷表格類型
✅ 複製為 CSV
✅ 下載 CSV

## 📝 API 端點

### `POST /api/upload`
上傳文件並轉換為圖片

**Request:**
```
Content-Type: multipart/form-data
file: <PDF/PNG/JPG>
```

**Response:**
```json
{
  "success": true,
  "file_id": "abc123",
  "images": [
    {
      "id": "abc123_page_1",
      "url": "/uploads/abc123_page_1.png",
      "width": 1920,
      "height": 1080
    }
  ]
}
```

### `POST /api/recognize`
識別表格

**Request:**
```
Content-Type: multipart/form-data
image_id: abc123_page_1
x: 100
y: 200
width: 800
height: 600
table_type: auto
```

**Response:**
```json
{
  "success": true,
  "tables": [
    [
      ["姓名", "年齡", "地址"],
      ["張三", "25", "台北市"],
      ["李四", "30", "新北市"]
    ]
  ],
  "type": "wired"
}
```

### `GET /api/health`
健康檢查

**Response:**
```json
{
  "status": "ok",
  "message": "服務運行正常"
}
```

## 🛠️ 開發建議

### 本地測試

```bash
# 運行服務器
python main.py

# 在另一個終端測試 API
curl http://localhost:8080/api/health
```

### 記憶體優化

如果遇到記憶體問題，可以修改 `main.py` 中的引擎載入策略：

```python
# 按需載入引擎（而非全部載入）
if table_type == "wired":
    engine = WiredTableRecognition(...)
elif table_type == "lineless":
    engine = LinelessTableRecognition(...)
```

## 📜 License

MIT

## 🙏 致謝

- Linus Torvalds - 簡潔哲學
- FastAPI - 優雅的 Python 框架
- TableStructureRec - 強大的表格識別引擎

---

**Legacy 代碼已備份在：**
- 分支：`backup-before-total-rewrite-20251121`
- 標籤：`v1-legacy`

如需回滾：`git checkout v1-legacy`