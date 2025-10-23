#!/usr/bin/env python3
"""
PDF 表格识别脚本
使用 TableStructureRec 进行表格识别
"""

import sys
import json
import os
from pathlib import Path

try:
    from lineless_table_rec.main import LinelessTableRecognition, LinelessTableInput
    from wired_table_rec.main import WiredTableRecognition, WiredTableInput
    from rapidocr_onnxruntime import RapidOCR
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"導入模組失敗: {str(e)}"
    }, ensure_ascii=False))
    sys.exit(1)


def recognize_tables_from_images(image_paths):
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
    
    for img_path in image_paths:
        if not os.path.exists(img_path):
            continue
            
        try:
            # 執行 OCR 識別
            ocr_result, _ = ocr_engine(img_path)
            if not ocr_result:
                # 如果 OCR 沒有結果，使用內部 OCR
                ocr_result = None
            
            # 先嘗試使用無線表格識別
            try:
                lineless_result = lineless_engine(img_path, ocr_result) if ocr_result else lineless_engine(img_path)
                
                if lineless_result and len(lineless_result) > 0:
                    # 無線表格識別成功
                    for table_html, table_cell_bboxes, elapse in lineless_result:
                        # 將 HTML 轉換為二維數組
                        rows = parse_html_table(table_html)
                        
                        results.append({
                            "tableIndex": table_index,
                            "html": table_html,
                            "rows": rows,
                            "confidence": 0.9,  # 無線表格默認置信度
                            "type": "lineless"
                        })
                        table_index += 1
                else:
                    # 嘗試有線表格識別
                    wired_result = wired_engine(img_path, ocr_result) if ocr_result else wired_engine(img_path)
                    
                    if wired_result and len(wired_result) > 0:
                        for table_html, table_cell_bboxes, elapse in wired_result:
                            rows = parse_html_table(table_html)
                            
                            results.append({
                                "tableIndex": table_index,
                                "html": table_html,
                                "rows": rows,
                                "confidence": 0.85,  # 有線表格默認置信度
                                "type": "wired"
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


def parse_html_table(html):
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
