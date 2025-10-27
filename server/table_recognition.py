#!/usr/bin/env python3
"""
PDF 表格识别脚本
使用 TableStructureRec 进行表格识别
"""

import sys
import json
import os
from pathlib import Path
from typing import Any, List, Optional

try:
    from lineless_table_rec.main import LinelessTableRecognition, LinelessTableInput
    from wired_table_rec.main import WiredTableRecognition, WiredTableInput
    from rapidocr_onnxruntime import RapidOCR
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"導入模組失敗: {str(e)}"
    }, ensure_ascii=False))
    sys.exit(1)


def preprocess_image(img_path: str) -> str:
    """
    圖片預處理：自動旋轉、增強對比度、去噪
    
    Args:
        img_path: 圖片路徑
        
    Returns:
        處理後的圖片路徑
    """
    try:
        from PIL import ImageEnhance, ImageFilter
        
        img = Image.open(img_path)
        width, height = img.size
        
        # 1. 如果寬度大於高度，圖片是橫向的，需要旋轉 90 度
        if width > height * 1.2:  # 1.2 是容錯係數
            img = img.rotate(90, expand=True)
            print(f"圖片已自動旋轉: {img_path} (原尺寸: {width}x{height})", file=sys.stderr)
        
        # 2. 轉換為 RGB 模式（如果是 RGBA 或其他模式）
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 3. 增強對比度（提高文字清晰度）
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)  # 增強 50%
        
        # 4. 銳化處理（讓邊緣更清晰）
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.3)  # 銳化 30%
        
        # 5. 輕微去噪（使用中值濾波）
        # img = img.filter(ImageFilter.MedianFilter(size=3))
        
        # 保存處理後的圖片（覆蓋原文件）
        img.save(img_path, quality=95)
        print(f"圖片預處理完成: {img_path}", file=sys.stderr)
        
        return img_path
    except Exception as e:
        print(f"圖片預處理失敗 {img_path}: {str(e)}", file=sys.stderr)
        return img_path


def recognize_tables_from_images(image_paths: List[str]) -> dict:
    """
    從圖片中識別表格
    
    Args:
        image_paths: 圖片路徑列表
        
    Returns:
        識別結果列表
    """
    results = []
    
    # 初始化 OCR 引擎
    try:
        ocr_engine = RapidOCR()
    except Exception as e:
        return {
            "success": False,
            "error": f"初始化 OCR 引擎失敗: {str(e)}"
        }
    
    # 初始化表格识别引擎
    try:
        lineless_engine = LinelessTableRecognition(LinelessTableInput())
        wired_engine = WiredTableRecognition(WiredTableInput())
    except Exception as e:
        return {
            "success": False,
            "error": f"初始化表格識別引擎失敗: {str(e)}"
        }
    
    table_index = 0
    
    for page_number, img_path in enumerate(image_paths, start=1):
        if not os.path.exists(img_path):
            continue
            
        try:
            # 執行 OCR 識別
            ocr_result: Any
            ocr_result, _ = ocr_engine(img_path)
            if not ocr_result:
                ocr_result = None
            
            # 同時嘗試有線和無線表格識別，選擇較好的結果
            try:
                lineless_result = None
                wired_result = None
                
                # 嘗試無線表格識別
                try:
                    lineless_result = lineless_engine(img_path, ocr_result)
                except Exception as e:
                    print(f"無線表格識別失敗: {str(e)}", file=sys.stderr)
                
                # 嘗試有線表格識別
                try:
                    wired_result = wired_engine(img_path, ocr_result)
                except Exception as e:
                    print(f"有線表格識別失敗: {str(e)}", file=sys.stderr)
                
                # 解析兩種結果
                lineless_rows = []
                wired_rows = []
                
                if lineless_result and lineless_result.pred_html and '<table>' in lineless_result.pred_html:
                    lineless_rows = parse_html_table(lineless_result.pred_html)
                
                if wired_result and wired_result.pred_html and '<table>' in wired_result.pred_html:
                    wired_rows = parse_html_table(wired_result.pred_html)
                
                # 選擇較好的結果（優先選擇有線表格，因為對於有邊框的表格效果更好）
                best_result = None
                best_rows = []
                result_type = ""
                confidence = 0.0
                
                # 如果有線表格有結果，優先使用
                if wired_rows and len(wired_rows) > 0 and any(len(row) > 0 for row in wired_rows):
                    best_result = wired_result
                    best_rows = wired_rows
                    result_type = "wired"
                    confidence = 0.9
                # 否則使用無線表格結果
                elif lineless_rows and len(lineless_rows) > 0 and any(len(row) > 0 for row in lineless_rows):
                    best_result = lineless_result
                    best_rows = lineless_rows
                    result_type = "lineless"
                    confidence = 0.85
                
                if best_result and best_rows:
                
                    # 調試：輸出原始 HTML
                    print(f"\n=== 表格 {table_index} 調試信息 ===", file=sys.stderr)
                    print(f"類型: {result_type}", file=sys.stderr)
                    print(f"原始行數: {len(best_rows)}", file=sys.stderr)
                    print(f"原始列數: {max(len(row) for row in best_rows) if best_rows else 0}", file=sys.stderr)
                    print(f"HTML 長度: {len(best_result.pred_html)}", file=sys.stderr)
                    print(f"HTML 預覽: {best_result.pred_html[:300]}", file=sys.stderr)
                    print(f"原始數據（前3行）: {best_rows[:3]}", file=sys.stderr)
                    
                    # 後處理：清理常見錯誤
                    cleaned_rows = clean_table_data(best_rows)
                    
                    print(f"清理後行數: {len(cleaned_rows)}", file=sys.stderr)
                    print(f"清理後數據（前3行）: {cleaned_rows[:3]}", file=sys.stderr)
                    print("=" * 50, file=sys.stderr)
                    
                    results.append({
                        "tableIndex": table_index,
                        "pageNumber": page_number,
                        "html": best_result.pred_html,
                        "rows": cleaned_rows,
                        "confidence": confidence,
                        "type": result_type
                    })
                    table_index += 1
                        
            except Exception as table_err:
                # 記錄表格識別錯誤但繼續處理
                print(f"表格識別錯誤 {img_path}: {str(table_err)}", file=sys.stderr)
                continue
                        
        except Exception as e:
            # 記錄 OCR 錯誤但繼續處理其他圖片
            print(f"OCR 錯誤 {img_path}: {str(e)}", file=sys.stderr)
            continue
    
    return {
        "success": True,
        "tables": results,
        "totalTables": len(results)
    }


def detect_repeating_pattern(text: str) -> Optional[List[str]]:
    """
    檢測字串中的重複模式並分割
    例如：'126,300126,300126,300' -> ['126,300', '126,300', '126,300']
    
    Args:
        text: 待檢測的字串
        
    Returns:
        如果檢測到重複模式，返回分割後的列表；否則返回 None
    """
    import re
    
    if not text or len(text) < 2:
        return None
    
    # 嘗試不同的模式長度（從短到長）
    # 最小模式長度為 2，最大為字串長度的一半
    for pattern_len in range(2, len(text) // 2 + 1):
        pattern = text[:pattern_len]
        
        # 檢查是否是完全重複
        if text == pattern * (len(text) // pattern_len):
            count = len(text) // pattern_len
            return [pattern] * count
        
        # 檢查是否是近似重複（允許最後一個不完整）
        full_repeats = len(text) // pattern_len
        if full_repeats > 1:
            reconstructed = pattern * full_repeats
            remainder = text[len(reconstructed):]
            
            # 如果餘數是模式的前綴，則認為是重複模式
            if remainder and pattern.startswith(remainder):
                return [pattern] * full_repeats
            
            # 如果餘數很短（小於模式長度的20%），可能是識別錯誤，忽略
            if len(remainder) > 0 and len(remainder) < pattern_len * 0.2:
                return [pattern] * full_repeats
    
    # 特殊處理：檢測帶分隔符的重複（如 "123,456123,456"）
    # 嘗試常見的數字模式
    number_patterns = [
        r'[\d,]+',  # 帶千分位的數字
        r'\d+',     # 純數字
        r'[\$¥€£₩][\d,]+',  # 帶貨幣符號的數字
        r'NT\$[\d,]+',      # NT$數字
        r'\d{4}/\d{2}',     # 日期
    ]
    
    for pattern_regex in number_patterns:
        matches = re.findall(pattern_regex, text)
        if len(matches) >= 2:
            # 檢查是否所有匹配項相似（允許小差異）
            first = matches[0]
            similar_count = sum(1 for m in matches if m == first or abs(len(m) - len(first)) <= 1)
            
            # 如果大部分匹配項相似，認為是重複模式
            if similar_count >= len(matches) * 0.7:
                return matches
    
    return None


def clean_table_data(rows: List[List[str]]) -> List[List[str]]:
    """
    清理表格數據中的常見錯誤，並自動將粘連的列分割開
    
    Args:
        rows: 二維陣列表示的表格
        
    Returns:
        清理後的表格數據
    """
    import re
    
    # 第一步：初步清理每個儲存格
    cleaned_rows = []
    for row in rows:
        cleaned_row = []
        for cell in row:
            if not cell or cell == '':
                cleaned_row.append('-')
                continue
            
            # 清理單元格內容
            cleaned_cell = cell.strip()
            
            # 移除多餘的空白字符
            cleaned_cell = re.sub(r'\s+', ' ', cleaned_cell)
            
            cleaned_row.append(cleaned_cell if cleaned_cell else '-')
        
        cleaned_rows.append(cleaned_row)
    
    # 第二步：檢測並分割粘連的列
    expanded_rows = []
    max_cols = 0
    
    for row_idx, row in enumerate(cleaned_rows):
        expanded_row = []
        
        for cell in row:
            if cell == '-':
                expanded_row.append(cell)
                continue
            
            # 嘗試檢測重複模式
            split_cells = detect_repeating_pattern(cell)
            
            if split_cells and len(split_cells) > 1:
                # 檢測到重複，分割成多列
                print(f"🔍 檢測到重複模式 (行{row_idx}): '{cell}' -> {split_cells}", file=sys.stderr)
                expanded_row.extend(split_cells)
            else:
                # 沒有重複，保持原樣
                expanded_row.append(cell)
        
        expanded_rows.append(expanded_row)
        max_cols = max(max_cols, len(expanded_row))
    
    # 第三步：統一列數（補齊短行）
    for row in expanded_rows:
        while len(row) < max_cols:
            row.append('-')
    
    # 第四步：再次清理每個儲存格（處理分割後的數據）
    final_rows = []
    for row in expanded_rows:
        final_row = []
        for cell in row:
            if cell == '-' or not cell:
                final_row.append('-')
                continue
            
            cleaned_cell = cell.strip()
            
            # 修正帶有貨幣符號的數字粘連問題（例如：$28,476$28,476）
            currency_pattern = r'^([\$¥€£₩][\d,]+)\1+$'
            match = re.match(currency_pattern, cleaned_cell)
            if match:
                cleaned_cell = match.group(1)
            else:
                # 嘗試 NT$ 完全重複
                nt_pattern = r'^(NT\$[\d,]+)\1+$'
                match = re.match(nt_pattern, cleaned_cell)
                if match:
                    cleaned_cell = match.group(1)
                else:
                    # 處理多個貨幣符號
                    if cleaned_cell.count('$') > 1 or cleaned_cell.count('¥') > 1:
                        tokens = re.findall(r'(?:NT\$|[\$¥€£₩])[\d,]+(?:\.\d+)?', cleaned_cell)
                        if tokens:
                            cleaned_cell = tokens[0]
            
            # 修正日期粘連問題
            if re.match(r'^(\d{4}/\d{2})\d{4}/\d{2}$', cleaned_cell):
                match = re.match(r'^(\d{4}/\d{2}).*', cleaned_cell)
                if match:
                    cleaned_cell = match.group(1)
            
            final_row.append(cleaned_cell if cleaned_cell else '-')
        
        final_rows.append(final_row)
    
    print(f"✅ 分列完成：{len(rows)} 行 × {max(len(r) for r in rows)} 列 -> {len(final_rows)} 行 × {max_cols} 列", file=sys.stderr)
    
    return final_rows


def parse_html_table(html: str) -> List[List[str]]:
    """
    解析 HTML 表格為二維陣列
    
    Args:
        html: HTML 表格字串
        
    Returns:
        二維陣列表示的表格
    """
    from html.parser import HTMLParser
    
    class TableParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.rows = []
            self.current_row = []
            self.current_cell = []
            self.in_table = False
            self.in_row = False
            self.in_cell = False
            
        def handle_starttag(self, tag, attrs):
            if tag == 'table':
                self.in_table = True
            elif tag == 'tr' and self.in_table:
                self.in_row = True
                self.current_row = []
            elif tag in ['td', 'th'] and self.in_row:
                self.in_cell = True
                self.current_cell = []
                
        def handle_endtag(self, tag):
            if tag == 'table':
                self.in_table = False
            elif tag == 'tr' and self.in_row:
                if self.current_row:
                    self.rows.append(self.current_row)
                self.in_row = False
            elif tag in ['td', 'th'] and self.in_cell:
                cell_text = ''.join(self.current_cell).strip()
                self.current_row.append(cell_text)
                self.in_cell = False
                
        def handle_data(self, data):
            if self.in_cell:
                self.current_cell.append(data)
    
    parser = TableParser()
    try:
        parser.feed(html)
        return parser.rows if parser.rows else [[]]
    except:
        # 如果解析失败，返回空表格
        return [[]]


def main():
    """主函式"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "缺少圖片路徑參數"
        }, ensure_ascii=False))
        sys.exit(1)
    
    # 獲取圖片路徑（可以是單個路徑或逗號分隔的多個路徑）
    image_paths_str = sys.argv[1]
    image_paths = [p.strip() for p in image_paths_str.split(',') if p.strip()]
    
    if not image_paths:
        print(json.dumps({
            "success": False,
            "error": "未提供有效的圖片路徑"
        }, ensure_ascii=False))
        sys.exit(1)
    
    # 執行表格識別
    result = recognize_tables_from_images(image_paths)
    
    # 輸出 JSON 結果
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
