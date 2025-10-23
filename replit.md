# PDF 表格識別工具

## 專案概述
基於 TableStructureRec 的 PDF 表格識別網頁應用，允許用戶上傳 PDF 檔案後自動識別並提取其中的表格。使用 Fullstack JavaScript 技術棧（React + Express），後端調用 Python 的 TableStructureRec 庫進行表格識別。所有界面使用繁體中文。

## 最近變更 (2025-10-23)
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
1. **檔案上傳**: 支援拖放和點擊上傳 PDF、PNG、JPG、JPEG 檔案（最大 50MB）
2. **表格識別**: 自動識別檔案中的所有表格，支援有線和無線表格，處理各種內容（純文字、掃描圖片、混合內容）
3. **可編輯表格**: 
   - 雙擊儲存格進行即時編輯
   - Excel 風格的範圍選取（拖動選取多個儲存格）
   - 即時統計計算（總和、平均、最大、最小、計數）
   - 編輯/檢視模式切換
   - 複製選取範圍
4. **結果展示**: 多表格標籤切換，表格預覽
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
  success: boolean;
  filename: string;
  tables: TableData[];
}

interface TableData {
  tableId: number;
  cells: string[][];
}
```

### 工作流程
1. 用戶上傳 PDF 檔案
2. 後端保存 PDF 並使用 pdftoppm 轉換為圖片
3. 調用 Python 腳本進行表格識別
4. 返回識別結果給前端
5. 前端展示表格並提供匯出功能
6. 後端清理臨時檔案

## 部署資訊
- 平台: Replit
- 運行命令: `npm run dev` (啟動 Express + Vite)
- 端口: 5000

## 技術決策
- **PDF 轉換**: 使用 pdftoppm 命令行工具（pdf-poppler 不支援 Linux）
- **存儲**: 使用記憶體存儲（MemStorage）
- **圖標庫**: lucide-react（正確的圖標名稱：CloudUpload, FileText）
- **主題**: 深色模式為主要主題，支援淺色模式切換

## Python 依賴
- lineless-table-rec: 無線表格識別
- wired-table-rec: 有線表格識別
- rapidocr-onnxruntime: OCR 引擎

## 開發注意事項
- 所有界面文字必須使用繁體中文
- 使用 data-testid 屬性標記互動元素
- 遵循 Material Design 3 設計原則
- 確保響應式設計在各種螢幕尺寸下正常工作
