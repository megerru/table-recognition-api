#!/usr/bin/env python3
"""
表格辨識 API - Linus 式極簡架構
用途：上傳 PDF/圖片，OCR 識別表格，返回結構化數據
"""

import os
import sys
import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 表格識別引擎
try:
    from PIL import Image
    from pdf2image import convert_from_path
    from lineless_table_rec.main import LinelessTableRecognition, LinelessTableInput
    from wired_table_rec.main import WiredTableRecognition, WiredTableInput
    from rapidocr_onnxruntime import RapidOCR
except ImportError as e:
    print(f"❌ 依賴缺失: {e}")
    print("請執行: pip install fastapi uvicorn python-multipart pillow pdf2image")
    print("       pip install lineless-table-rec wired-table-rec rapidocr-onnxruntime")
    sys.exit(1)

# 配置
UPLOAD_DIR = Path("uploads")
STATIC_DIR = Path("static")
MODELS_DIR = Path("models")

# 確保目錄存在
UPLOAD_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

# FastAPI 應用
app = FastAPI(title="表格辨識 API", version="2.0-linus")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境應限制為特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態文件服務（前端）
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ============================================
# 工具函數
# ============================================

def pdf_to_images(pdf_path: Path) -> List[Path]:
    """將 PDF 轉換為圖片"""
    try:
        images = convert_from_path(pdf_path, dpi=200)
        image_paths = []

        for i, image in enumerate(images):
            image_path = UPLOAD_DIR / f"{pdf_path.stem}_page_{i+1}.png"
            image.save(image_path, "PNG")
            image_paths.append(image_path)

        return image_paths
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 轉換失敗: {str(e)}")


def crop_image(image_path: Path, x: int, y: int, width: int, height: int) -> Path:
    """裁剪圖片指定區域"""
    try:
        image = Image.open(image_path)
        cropped = image.crop((x, y, x + width, y + height))

        cropped_path = UPLOAD_DIR / f"{image_path.stem}_cropped_{uuid.uuid4().hex[:8]}.png"
        cropped.save(cropped_path, "PNG")

        return cropped_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"裁剪失敗: {str(e)}")


def recognize_table(image_path: Path, table_type: str = "auto") -> dict:
    """
    識別表格

    Args:
        image_path: 圖片路徑
        table_type: 表格類型 ("wired" 有線, "lineless" 無線, "auto" 自動判斷)

    Returns:
        {"success": bool, "tables": [...], "error": str}
    """
    try:
        # 初始化 OCR 引擎
        ocr_engine = RapidOCR()

        
        # 執行 OCR 並驗證結果
        ocr_result = ocr_engine(str(image_path))
        
        # 驗證並過濾 OCR 結果（防止 lineless_table_rec 崩潰）
#         if ocr_result:
#             validated_results = []
#             for item in ocr_result:
#                 # 檢查基本結構：[box, text, confidence]
#                 if not item or len(item) < 3:
#                     continue
#                 
#                 box = item[0]
#                 # box 必須是 list/tuple 且有4個點
#                 if not isinstance(box, (list, tuple)) or len(box) != 4:
#                     continue
#                 
#                 # 每個點必須是 [x, y] 格式
#                 valid_box = True
#                 for point in box:
#                     if not isinstance(point, (list, tuple)) or len(point) != 2:
#                         valid_box = False
#                         break
#                     # 確保 x, y 是數字
#                     try:
#                         float(point[0])
#                         float(point[1])
#                     except (TypeError, ValueError):
#                         valid_box = False
#                         break
#                 
#                 if valid_box:
#                     validated_results.append(item)
#             
#             ocr_result = validated_results
        
        if not ocr_result:
            return {"success": False, "tables": [], "type": table_type, "error": "OCR 未檢測到有效文字"}
        # 根據類型選擇引擎
        if table_type == "wired":
            wired_input = WiredTableInput()
            wired_input.col_threshold = 10
            wired_input.row_threshold = 8
            engine = WiredTableRecognition(wired_input)
            result, _ = engine(str(image_path), ocr_result=ocr_result)

        elif table_type == "lineless":
            engine = LinelessTableRecognition(LinelessTableInput())
            result, _ = engine(str(image_path), ocr_result=ocr_result)

        else:  # auto - 嘗試兩種引擎
            # 先嘗試有線表格
            try:
                wired_input = WiredTableInput()
                wired_input.col_threshold = 10
                wired_input.row_threshold = 8
                wired_engine = WiredTableRecognition(wired_input)

                result, _ = wired_engine(str(image_path), ocr_result=ocr_result)

                # 如果有線表格識別成功，返回結果
                if result and len(result) > 0:
                    return {"success": True, "tables": result, "type": "wired"}
            except:
                pass

            # 否則嘗試無線表格
            lineless_engine = LinelessTableRecognition(LinelessTableInput())

            result, _ = lineless_engine(str(image_path), ocr_result=ocr_result)
            return {"success": True, "tables": result, "type": "lineless"}

        return {"success": True, "tables": result, "type": table_type}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================
# API 路由
# ============================================

@app.get("/")
async def root():
    """根路徑 - 返回前端頁面"""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "表格辨識 API v2.0 - Linus 式極簡架構"}


@app.get("/api/health")
async def health_check():
    """健康檢查"""
    return {"status": "ok", "message": "服務運行正常"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    上傳文件並轉換為圖片

    支援格式：PDF, PNG, JPG, JPEG

    Returns:
        {
            "success": bool,
            "file_id": str,
            "images": [{"id": str, "url": str, "width": int, "height": int}]
        }
    """
    # 驗證文件類型
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="不支援的文件格式")

    # 保存上傳文件
    file_id = uuid.uuid4().hex
    file_ext = Path(file.filename).suffix
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"

    with file_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # 轉換為圖片
    if file.content_type == "application/pdf":
        image_paths = pdf_to_images(file_path)
    else:
        image_paths = [file_path]

    # 獲取圖片信息
    images = []
    for img_path in image_paths:
        img = Image.open(img_path)
        images.append({
            "id": img_path.stem,
            "url": f"/uploads/{img_path.name}",
            "width": img.width,
            "height": img.height
        })

    return {
        "success": True,
        "file_id": file_id,
        "images": images
    }


@app.post("/api/recognize")
async def recognize(
    image_id: str = Form(...),
    x: int = Form(0),
    y: int = Form(0),
    width: int = Form(0),
    height: int = Form(0),
    table_type: str = Form("auto")
):
    """
    識別表格

    Args:
        image_id: 圖片 ID
        x, y, width, height: 裁剪區域（0 表示全圖）
        table_type: 表格類型 ("wired", "lineless", "auto")

    Returns:
        {
            "success": bool,
            "tables": [[row1], [row2], ...],
            "type": str,
            "error": str
        }
    """
    # 查找圖片
    image_files = list(UPLOAD_DIR.glob(f"{image_id}*"))
    if not image_files:
        raise HTTPException(status_code=404, detail="圖片不存在")

    image_path = image_files[0]

    # 如果指定了裁剪區域，先裁剪
    if width > 0 and height > 0:
        image_path = crop_image(image_path, x, y, width, height)

    # 識別表格
    result = recognize_table(image_path, table_type)

    return result


@app.get("/uploads/{filename}")
async def get_upload(filename: str):
    """獲取上傳的文件"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(file_path)


# ============================================
# 啟動服務器
# ============================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))

    print("=" * 50)
    print("🚀 表格辨識 API v2.0 - Linus 式極簡架構")
    print("=" * 50)
    print(f"📍 服務地址: http://0.0.0.0:{port}")
    print(f"📁 上傳目錄: {UPLOAD_DIR.absolute()}")
    print(f"🌐 靜態文件: {STATIC_DIR.absolute()}")
    print("=" * 50)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )