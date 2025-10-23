# PDF 表格識別工具

## 專案概述
基於 TableStructureRec 的 PDF 表格識別網頁應用，允許用戶上傳 PDF 檔案後自動識別並提取其中的表格。使用 Fullstack JavaScript 技術棧（React + Express），後端調用 Python 的 TableStructureRec 庫進行表格識別。所有界面使用繁體中文。

## 最近變更 (2025-10-23)

### 橫向表格和高密度數據優化
- ✅ **提升 PDF 解析度**：從 150 DPI 提升到 300 DPI（4 倍清晰度）
- ✅ **智能圖片預處理**：
  - 自動檢測並旋轉橫向圖片（寬度 > 高度 × 1.2）
  - 對比度增強 50%（提高文字清晰度）
  - 銳化處理 30%（增強表格邊緣）
  - RGB 格式標準化
- ✅ **即時處理日誌**：顯示圖片旋轉和預處理狀態

### 之前的變更
- ✅ 修復 Python 表格識別腳本初始化問題（正確配置 LinelessTableInput 和 WiredTableInput）
- ✅ 修復表格識別返回值處理錯誤（正確訪問 dataclass 的 pred_html 屬性）
- ✅ 安裝系統依賴（mesa, libglvnd）解決 OpenGL 庫缺失問題
- ✅ 實現可編輯表格功能：
  - 雙擊儲存格進行編輯
  - 拖動滑鼠選取多個儲存格（範圍選取，防止文字反白）
  - 自動計算選取範圍的統計數據（總數量、總和、除以1.05後的值）
  - 統計數字四捨五入到整數，使用千分位格式化
  - 複製選取範圍到剪貼板
  - 編輯/檢視模式切換，顯示當前模式狀態
- ✅ 簡繁轉換：使用 opencc-js 將識別結果自動轉為繁體中文
- ✅ UI 改善：擴大表格顯示區域（600px → 800px）
- ✅ 支援多種檔案格式：PDF、PNG、JPG、JPEG（圖片直接識別，PDF 先轉圖片）
- ✅ 完整支援各種 PDF 內容（純文字表格、掃描圖片、混合內容）
- ✅ 多頁 PDF 支援：
  - 後端 Python 腳本記錄每個表格來自哪一頁（pageNumber 欄位）
  - Tab 標籤和卡片標題顯示頁碼標籤（如「第 1 頁」）
  - 不同頁的表格之間有視覺分隔線
- ✅ 「全部顯示」模式：
  - 新增切換按鈕，可在 Tabs 模式和堆疊模式之間切換
  - 堆疊模式下所有表格垂直顯示，方便跨頁查看
  - 每個表格保持獨立編輯和統計功能
- ✅ 真實上傳進度追蹤：
  - 使用 XMLHttpRequest 追蹤實際檔案上傳進度（0-30%）
  - 顯示上傳的檔案大小和即時進度
- ✅ 詳細處理狀態反饋：
  - 上傳中：顯示檔案大小和上傳進度
  - 轉換中：PDF 轉圖片階段（35%）
  - 識別中：OCR 文字識別（60%）、表格結構分析（85%）
  - 完成：100%
  - 使用 isCompleted 標誌防止狀態競態問題

## 用戶偏好
- 界面語言：繁體中文（Traditional Chinese）
- 設計風格：Material Design 3，深色模式為主
- 主色調：藍色 (210 100% 58%)
- 字體：Noto Sans SC

## 專案架構

### 技術棧
- **前端**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **後端**: Express + TypeScript
- **表格識別**: Python 3.11 + TableStructureRec (lineless-table-rec, wired-table-rec, rapidocr-onnxruntime)
- **狀態管理**: React Query
- **路由**: Wouter
- **PDF 處理**: pdftoppm (Poppler)

### 核心功能
1. **檔案上傳**: 
   - 支援拖放和點擊上傳 PDF、PNG、JPG、JPEG 檔案（最大 50MB）
   - 真實上傳進度追蹤（顯示檔案大小和進度百分比）
   - 詳細處理狀態反饋（上傳中、轉換中、識別中、完成）
2. **表格識別**: 
   - 自動識別檔案中的所有表格，支援有線和無線表格
   - 處理各種內容（純文字、掃描圖片、混合內容）
   - 多頁 PDF 支援，自動標記每個表格的頁碼
3. **可編輯表格**: 
   - 雙擊儲存格進行即時編輯
   - Excel 風格的範圍選取（拖動選取多個儲存格）
   - 即時統計計算（總數量、總和、除以1.05後的值）
   - 統計數字四捨五入到整數，使用千分位格式化
   - 編輯/檢視模式切換
   - 複製選取範圍到剪貼板
4. **結果展示**: 
   - Tabs 模式：多表格標籤切換，顯示頁碼標籤
   - 「全部顯示」模式：所有表格垂直堆疊，方便跨頁查看
   - 不同頁的表格之間有視覺分隔線
5. **資料匯出**: 支援 CSV 和 HTML 格式下載（包含編輯後的數據）

### 主要組件
- `client/src/pages/home.tsx`: 主頁面，整合所有功能，簡繁轉換
- `client/src/components/upload-zone.tsx`: 檔案上傳區域（拖放支援）
- `client/src/components/processing-indicator.tsx`: 處理進度指示器
- `client/src/components/table-display.tsx`: 表格展示組件（標籤切換、編輯/檢視模式、模式狀態顯示）
- `client/src/components/editable-table.tsx`: 可編輯表格（範圍選取、統計計算、防止文字反白）
- `client/src/components/export-buttons.tsx`: 匯出按鈕
- `client/src/components/theme-toggle.tsx`: 深色/淺色模式切換
- `client/src/lib/convert.ts`: 簡繁轉換工具（opencc-js）

### API 端點
- `POST /api/upload`: 上傳 PDF 檔案並進行表格識別
  - Request: multipart/form-data (file: PDF 檔案)
  - Response: TableRecognitionResult (包含所有識別的表格數據)

### 數據模型
```typescript
// 表格數據結構
interface TableRecognitionResult {
  tableId: number;
  rows: string[][];
  pageNumber?: number;  // 表格來自哪一頁（多頁 PDF）
}

// 處理狀態
interface ProcessingStatus {
  status: "idle" | "uploading" | "converting" | "recognizing" | "completed" | "error";
  progress: number;  // 0-100
  message: string;
  currentStep?: string;  // 當前處理步驟
}
```

### 工作流程
1. 用戶上傳 PDF 檔案（顯示真實上傳進度 0-30%）
2. 後端保存 PDF 並使用 pdftoppm (300 DPI) 轉換為圖片（轉換中 35%）
3. **圖片預處理**：自動旋轉橫向圖片、增強對比度、銳化處理
4. 調用 Python 腳本進行表格識別（識別中 60-85%）
5. 數據清理：修正粘連數字、日期格式錯誤
6. 返回識別結果給前端（包含頁碼信息）
7. 前端將簡體中文轉換為繁體中文
8. 前端展示表格並提供編輯、統計、匯出功能
9. 後端清理臨時檔案

## 部署資訊
- 平台: Replit
- 運行命令: `npm run dev` (啟動 Express + Vite)
- 端口: 5000

## 技術決策
- **PDF 轉換**: 使用 pdftoppm 命令行工具（pdf-poppler 不支援 Linux），300 DPI 高解析度
- **圖片預處理**: 使用 Pillow (PIL) 進行旋轉、對比度增強、銳化處理
- **存儲**: 使用記憶體存儲（MemStorage）
- **圖標庫**: lucide-react（正確的圖標名稱：CloudUpload, FileText）
- **主題**: 深色模式為主要主題，支援淺色模式切換
- **上傳進度追蹤**: 使用 XMLHttpRequest 而非 fetch，以追蹤真實上傳進度
- **狀態管理**: 使用 isCompleted 標誌防止定時器競態問題，確保狀態序列正確

## Python 依賴
- lineless-table-rec: 無線表格識別
- wired-table-rec: 有線表格識別
- rapidocr-onnxruntime: OCR 引擎

## 開發注意事項
- 所有界面文字必須使用繁體中文
- 使用 data-testid 屬性標記互動元素
- 遵循 Material Design 3 設計原則
- 確保響應式設計在各種螢幕尺寸下正常工作
