# Linus 式極簡 Dockerfile
# 從 5 個 stage 降到 1 個 stage

FROM python:3.11-slim

# 安裝系統依賴（PDF 轉換需要 poppler-utils）
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 複製 Python 依賴文件
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 預載入 ONNX 模型（避免首次請求慢）
RUN python -c "from lineless_table_rec.main import LinelessTableRecognition, LinelessTableInput; LinelessTableRecognition(LinelessTableInput())" || true
RUN python -c "from wired_table_rec.main import WiredTableRecognition, WiredTableInput; WiredTableRecognition(WiredTableInput())" || true
RUN python -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()" || true

# 複製應用代碼
COPY main.py .
COPY static/ ./static/

# 創建目錄
RUN mkdir -p uploads models

# 環境變數
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 8080

# 健康檢查
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/health').read()"

# 啟動應用
CMD ["python", "main.py"]