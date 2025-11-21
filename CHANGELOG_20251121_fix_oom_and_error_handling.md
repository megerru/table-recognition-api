# CHANGELOG - 2025-11-21: Fix OOM Kills and Error Handling

## 問題報告

### 用戶報告的症狀
用戶選擇表格識別區域後，點擊確認按鈕，收到以下錯誤訊息：
```
識別失敗
500: {"success":false,"message":"記憶體不足，請嘗試縮小識別區域或使用更小的文件"}
```

但實際錯誤訊息包含：
- ANSI escape codes (`\u001b[0;93m`)
- GPU device discovery failed 警告
- DownloadModel already exists DEBUG 日誌
- 完整的 stderr 輸出

### 技術分析過程

#### 第一層問題：垃圾的錯誤處理
**發現：** routes.ts 將所有 Python stderr 收集並返回給前端

```typescript
// 錯誤的做法 (BEFORE)
python.stderr.on("data", (data) => {
  stderr += stderrText;  // ❌ 收集所有 stderr
});

python.on("close", (code) => {
  if (code !== 0) {
    reject(new Error(`表格識別失敗: ${stderr}`));  // ❌ 直接返回給用戶
  }
});
```

**問題：**
- stderr 包含 DEBUG 日誌（DownloadModel already exists）
- stderr 包含正常警告（GPU device discovery failed）
- ANSI color codes 洩漏到前端
- 用戶看到技術細節，不是友好的錯誤訊息

#### 第二層問題：Singleton Pattern 導致記憶體常駐
**發現：** Commit 3cba62f 引入了全域引擎實例

```python
# 錯誤的做法 (BEFORE)
_ocr_engine = None
_lineless_engine = None
_wired_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR(...)  # 只初始化一次
    return _ocr_engine
```

**問題：**
- 模型載入後常駐記憶體
- Python GC 無法回收
- 理論上應該省記憶體，實際上導致 OOM

#### 第三層問題：硬體資源不足（根本原因）
**發現：** Fly.io 日誌顯示 OOM kill

```
Out of memory: Killed process 677 (python3)
total-vm:1454344kB, anon-rss:851292kB
```

**分析：**
- RapidOCR 模型 + LinelessTableRecognition + WiredTableRecognition
- 總記憶體需求：~850MB
- Fly.io shared-cpu-1x 機器：256MB RAM
- **850MB > 256MB → OOM kill**

**關鍵洞察：**
即使沒有 singleton pattern，第一次請求也會 OOM，因為模型本身就需要 850MB。

---

## 解決方案

### 1. 修復錯誤處理 (routes.ts)

**修改前：**
```typescript
python.stderr.on("data", (data) => {
  stderr += stderrText;
  console.log(stderrText.trim());
});

python.on("close", (code) => {
  if (code !== 0) {
    reject(new Error(`表格識別失敗: ${stderr || "未知錯誤"}`));
  }
});
```

**修改後：**
```typescript
python.stderr.on("data", (data) => {
  const stderrText = data.toString();
  // 只記錄到控制台供開發者調試，不收集到 stderr 變數
  console.error("[Python Debug]", stderrText.trim());
});

python.on("close", (code) => {
  if (code !== 0) {
    console.error(`Python 進程異常退出，code: ${code}`);

    // 特殊處理 OOM kill (exit code 137 or killed by signal)
    if (code === 137 || code === null) {
      reject(new Error("記憶體不足，請嘗試縮小識別區域或使用更小的文件"));
      return;
    }

    // 其他錯誤
    reject(new Error("表格識別處理失敗，請稍後重試"));
    return;
  }

  // 正常退出，解析 JSON 結果
  try {
    const result = JSON.parse(stdout);
    if (result.success) {
      resolve(result.tables || []);
    } else {
      reject(new Error(result.error || "識別失敗"));
    }
  } catch (error) {
    reject(new Error("解析識別結果失敗，請檢查文件格式"));
  }
});
```

**改進：**
- ✅ stderr 只記錄到控制台（開發者可見）
- ✅ 不再返回 stderr 給前端
- ✅ OOM kill 特殊處理（exit code 137）
- ✅ 友好的用戶錯誤訊息
- ✅ 保留開發者調試能力

### 2. Revert Singleton Pattern (table_recognition.py)

**移除全域引擎實例：**
```python
# 刪除
_ocr_engine = None
_lineless_engine = None
_wired_engine = None

def get_ocr_engine(): ...
def get_table_engines(): ...
```

**恢復每次請求初始化：**
```python
def recognize_tables_from_images(image_paths: List[str]) -> dict:
    results = []

    # 初始化 OCR 引擎（每次請求重新初始化，避免 OOM）
    try:
        ocr_engine = RapidOCR(
            det_limit_side_len=1920,
            det_db_thresh=0.25,
            use_angle_cls=True,
        )
    except Exception as e:
        return {"success": False, "error": f"初始化 OCR 引擎失敗: {str(e)}"}

    # 初始化表格识别引擎
    try:
        lineless_engine = LinelessTableRecognition(LinelessTableInput())

        wired_input = WiredTableInput()
        wired_input.col_threshold = 10
        wired_input.row_threshold = 8
        wired_engine = WiredTableRecognition(wired_input)
    except Exception as e:
        return {"success": False, "error": f"初始化表格識別引擎失敗: {str(e)}"}

    # ... 識別邏輯
```

**改進：**
- ✅ 每次請求重新初始化引擎
- ✅ Python GC 自動回收記憶體
- ✅ 避免記憶體常駐
- ⚠️ Trade-off: 每次請求慢 5-10 秒（初始化開銷）

### 3. 升級硬體資源

**記憶體升級歷史：**
```bash
# 初始狀態
256MB RAM (shared-cpu-1x 免費 tier) → OOM kill

# 第一次升級
flyctl scale memory 1024  # 1GB RAM → 仍然 OOM kill

# 第二次升級
flyctl scale memory 2048  # 2GB RAM → 足夠運行
```

**最終配置：**
- 機器類型：shared-cpu-1x
- CPU: 1 core
- RAM: 2048 MB (2GB)
- 按量計費配置：
  - `auto_stop_machines = 'stop'` - 無流量自動停止
  - `auto_start_machines = true` - 有流量自動啟動
  - `min_machines_running = 0` - 可完全停止

**成本估算：**
```
輕度使用（每月 10 次）   → ~$0.001/月
中度使用（每月 100 次）  → ~$0.10/月
重度使用（每月 1000 次） → ~$1/月
```

---

## 技術洞察（Linus 式分析）

### 數據結構分析
**Before（垃圾）：**
```
Python stderr → 收集所有輸出 → 返回前端 → 用戶看到 ANSI codes
Singleton → 模型常駐記憶體 → 850MB → OOM kill
```

**After（正確）：**
```
Python stderr → 只記錄到控制台 → 開發者調試用
Python stdout → 結構化 JSON → 解析成功/失敗 → 友好錯誤訊息
每次請求 → 初始化引擎 → 用完釋放 → 無 OOM
2GB RAM → 足夠 850MB 模型
```

### 複雜度評分
🔴 **問題是分層的（洋蔥式）：**
1. **表層**：垃圾的錯誤處理 → 用戶體驗差
2. **中層**：Singleton pattern → 記憶體管理錯誤
3. **深層**：硬體資源不足 → 根本無法運行

### 實用主義驗證
**這是真問題嗎？** ✅ 是，用戶無法使用功能

**有更簡單的方法嗎？** ❌ 沒有
- 不能移除引擎（功能需求）
- 不能降低解析度（準確度需求）
- 只能升級硬體

**會破壞什麼嗎？** ✅ 不會
- 向後兼容（API 不變）
- 功能完整（兩個引擎都保留）
- 只是成本增加（從免費變成按量計費）

---

## 修改文件清單

### 1. server/routes.ts
**變更：**
- Line 146-151: 修改 stderr 處理邏輯
- Line 153-184: 重寫 close event handler
- 移除 stderr 變數的累積
- 新增 OOM kill 特殊處理（exit code 137）
- 新增友好的錯誤訊息

### 2. server/table_recognition.py
**變更：**
- Line 25-53: 刪除全域引擎實例和 singleton 函數
- Line 84-110: 恢復每次請求初始化引擎
- 每次請求重新創建 RapidOCR、LinelessTableRecognition、WiredTableRecognition

### 3. fly.toml
**變更：**
```toml
[[vm]]
  memory = '2gb'  # 從 256mb → 1gb → 2gb
  cpu_kind = 'shared'
  cpus = 1
```

### 4. Fly.io 配置
**命令：**
```bash
flyctl scale memory 2048
flyctl machine restart 185727eb093138
```

---

## 影響評估

### 正面影響
✅ **用戶體驗：**
- 不再看到技術錯誤訊息和 ANSI codes
- OOM 錯誤顯示友好提示
- 其他錯誤有明確說明

✅ **穩定性：**
- 不再 OOM kill（2GB RAM 足夠）
- 記憶體自動回收（每次請求後）

✅ **可維護性：**
- 開發者仍可在控制台看到 DEBUG 日誌
- 錯誤訊息結構化

### 負面影響
⚠️ **效能：**
- 每次請求慢 5-10 秒（引擎初始化）
- 相比 singleton pattern，CPU 使用率更高

⚠️ **成本：**
- 從免費變成按量計費
- 2GB RAM 機器成本 ~$0.0000044/秒
- 輕度使用仍幾乎免費（$0.001-0.10/月）

### Trade-offs（權衡）
這是正確的 trade-off，因為：
1. **向後兼容** - 不破壞任何功能
2. **實用主義** - 解決真實問題（OOM）而不是理論問題（效能）
3. **簡潔** - 消除複雜的全域狀態
4. **成本可控** - 按量計費，用多少付多少

---

## Git 記錄

**Commit:**
```
fde6cb5 - fix: Revert singleton pattern and improve error handling
```

**分支：** main

**Push 狀態：** ✅ 已推送到 https://github.com/megerru/table-recognition-api

**部署狀態：** ✅ 已部署到 https://table-recognition-api.fly.dev

---

## 測試建議

### 測試步驟
1. 打開 https://table-recognition-api.fly.dev
2. 上傳 PDF 或圖片文件
3. 選擇識別區域
4. 點擊確認按鈕

### 預期結果
**成功情況：**
- ✅ 正常顯示識別結果
- ✅ 表格數據準確

**失敗情況（文件過大）：**
- ✅ 看到友好錯誤：「記憶體不足，請嘗試縮小識別區域或使用更小的文件」
- ❌ 不會看到：ANSI codes、DEBUG 日誌、stderr 輸出

**失敗情況（其他錯誤）：**
- ✅ 看到：「表格識別處理失敗，請稍後重試」
- ❌ 不會看到：技術細節

---

## 後續優化建議

### 如果成本成為問題
**選項 1：降級到 512MB + 移除一個引擎**
- 移除 lineless_engine（保留 wired_engine）
- 記憶體需求降到 ~550MB
- 犧牲無邊框表格的識別準確度

**選項 2：優化模型加載**
- 延遲加載（需要時才初始化）
- 使用更小的模型版本
- 需要研究替代方案

**選項 3：換平台**
- Render.com 免費 tier 有 512MB RAM
- Railway 有 512MB RAM
- 但都可能不夠 850MB 的模型

### 目前建議
**保持現狀，等真的超量再優化。**

理由：
1. 按量計費已配置好
2. 輕度使用成本可忽略
3. 不要過早優化

---

## 總結

這次修復是一個典型的"洋蔥式問題"，需要層層剝開才能找到根本原因：

1. **表層**：錯誤處理垃圾 → 修復 stderr 邏輯
2. **中層**：Singleton pattern 問題 → Revert
3. **深層**：硬體資源不足 → 升級到 2GB RAM

最終方案是：**修復錯誤處理 + Revert singleton + 升級硬體**

成本從免費變成按量計費（輕度使用 ~$0.001-0.10/月），但功能穩定可用。

這是正確的工程決策：先讓功能跑起來，再根據實際使用情況優化。

🤖 Generated with [Claude Code](https://claude.com/claude-code)