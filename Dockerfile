# Stage 1: Base image with system dependencies
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    poppler-utils \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Stage 3: Build the application
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Install dev dependencies for build
RUN npm install --save-dev

# Build the application
RUN npm run build

# Stage 4: Install Python dependencies and preload models
FROM base AS python-deps

# Copy Python requirements
COPY pyproject.toml ./

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages \
    lineless-table-rec>=0.0.9 \
    wired-table-rec>=0.0.7 \
    rapidocr-onnxruntime>=1.3.0 \
    Pillow>=10.0.0 \
    onnxruntime>=1.16.0 \
    numpy>=1.24.0 \
    opencv-python-headless>=4.8.0 \
    pyclipper>=1.3.0

# Preload ONNX models to avoid runtime downloads
# This will cache the models in the image
RUN python3 -c "from lineless_table_rec.main import LinelessTableRecognition, LinelessTableInput; LinelessTableRecognition(LinelessTableInput())" || true
RUN python3 -c "from wired_table_rec.main import WiredTableRecognition, WiredTableInput; WiredTableRecognition(WiredTableInput())" || true
RUN python3 -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()" || true

# Stage 5: Production image
FROM base AS production

# Install Python dependencies directly in production stage
RUN pip3 install --no-cache-dir --break-system-packages \
    lineless-table-rec>=0.0.9 \
    wired-table-rec>=0.0.7 \
    rapidocr-onnxruntime>=1.3.0 \
    Pillow>=10.0.0 \
    onnxruntime>=1.16.0 \
    numpy>=1.24.0 \
    opencv-python-headless>=4.8.0 \
    pyclipper>=1.3.0

# Preload ONNX models in production stage
RUN python3 -c "from lineless_table_rec.main import LinelessTableRecognition, LinelessTableInput; LinelessTableRecognition(LinelessTableInput())" || true
RUN python3 -c "from wired_table_rec.main import WiredTableRecognition, WiredTableInput; WiredTableRecognition(WiredTableInput())" || true
RUN python3 -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()" || true

# Copy Node.js dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy server scripts
COPY server/table_recognition.py ./server/table_recognition.py
COPY server/crop_image.py ./server/crop_image.py

# Create uploads directory
RUN mkdir -p uploads/images

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
