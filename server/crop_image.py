#!/usr/bin/env python3
"""
圖片裁切腳本
根據座標裁切指定區域
"""

import sys
from PIL import Image

def crop_image(input_path, output_path, x, y, width, height):
    """
    裁切圖片指定區域
    
    Args:
        input_path: 輸入圖片路徑
        output_path: 輸出圖片路徑
        x: 左上角 X 座標
        y: 左上角 Y 座標
        width: 寬度
        height: 高度
    """
    try:
        img = Image.open(input_path)
        
        # 裁切區域 (left, upper, right, lower)
        cropped = img.crop((x, y, x + width, y + height))
        
        # 保存裁切後的圖片
        cropped.save(output_path)
        
        print(f"成功裁切圖片: {output_path}")
        
    except Exception as e:
        print(f"裁切圖片失敗: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 7:
        print("使用方式: crop_image.py <input> <output> <x> <y> <width> <height>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    x = int(sys.argv[3])
    y = int(sys.argv[4])
    width = int(sys.argv[5])
    height = int(sys.argv[6])
    
    crop_image(input_path, output_path, x, y, width, height)
