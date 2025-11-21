/**
 * 表格辨識前端邏輯
 * 純 Vanilla JavaScript - 零框架依賴
 */

// API 基礎 URL
const API_BASE = window.location.origin;

// 全域狀態
let currentImageId = null;
let currentImageData = null;
let selectionRect = null;
let tableResults = null;

// DOM 元素
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const uploadStatus = document.getElementById('upload-status');
const previewSection = document.getElementById('preview-section');
const previewCanvas = document.getElementById('preview-canvas');
const selectionBox = document.getElementById('selection-box');
const tableTypeSelect = document.getElementById('table-type');
const recognizeBtn = document.getElementById('recognize-btn');
const resetSelectionBtn = document.getElementById('reset-selection');
const resultSection = document.getElementById('result-section');
const resultContainer = document.getElementById('result-container');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const newUploadBtn = document.getElementById('new-upload-btn');

// ============================================
// 文件上傳
// ============================================

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 驗證文件大小
    if (file.size > 10 * 1024 * 1024) {
        alert('文件過大，請選擇小於 10MB 的文件');
        return;
    }

    // 顯示上傳狀態
    uploadStatus.classList.remove('hidden');

    try {
        // 上傳文件
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('上傳失敗');
        }

        const data = await response.json();

        if (!data.success || !data.images || data.images.length === 0) {
            throw new Error('文件處理失敗');
        }

        // 保存圖片信息（目前只處理第一張）
        currentImageData = data.images[0];
        currentImageId = currentImageData.id;

        // 顯示預覽
        showPreview(currentImageData);

    } catch (error) {
        alert(`錯誤: ${error.message}`);
        console.error(error);
    } finally {
        uploadStatus.classList.add('hidden');
        fileInput.value = ''; // 重置 input
    }
});

// ============================================
// 圖片預覽與框選
// ============================================

function showPreview(imageData) {
    // 隱藏上傳區，顯示預覽區
    uploadSection.classList.add('hidden');
    previewSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    // 載入圖片到 Canvas
    const img = new Image();
    img.onload = () => {
        // 設置 Canvas 大小（縮放以適應螢幕）
        const maxWidth = window.innerWidth * 0.8;
        const scale = Math.min(1, maxWidth / img.width);

        previewCanvas.width = img.width * scale;
        previewCanvas.height = img.height * scale;

        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);

        // 保存縮放比例（用於計算實際座標）
        previewCanvas.dataset.scale = scale;
        previewCanvas.dataset.originalWidth = img.width;
        previewCanvas.dataset.originalHeight = img.height;
    };

    img.src = `${API_BASE}${imageData.url}`;

    // 重置選取
    selectionRect = null;
    selectionBox.classList.add('hidden');
}

// 滑鼠事件 - 框選區域
let isDrawing = false;
let startX = 0;
let startY = 0;

previewCanvas.addEventListener('mousedown', (e) => {
    const rect = previewCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isDrawing = true;

    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.classList.remove('hidden');
});

previewCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const rect = previewCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startX;
    const height = currentY - startY;

    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;

    if (width < 0) selectionBox.style.left = `${currentX}px`;
    if (height < 0) selectionBox.style.top = `${currentY}px`;
});

previewCanvas.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;

    const rect = previewCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    // 轉換為原始圖片座標
    const scale = parseFloat(previewCanvas.dataset.scale);
    selectionRect = {
        x: Math.round(x / scale),
        y: Math.round(y / scale),
        width: Math.round(width / scale),
        height: Math.round(height / scale)
    };

    console.log('選取區域:', selectionRect);
});

// 重置選取
resetSelectionBtn.addEventListener('click', () => {
    selectionRect = null;
    selectionBox.classList.add('hidden');
});

// ============================================
// 表格識別
// ============================================

recognizeBtn.addEventListener('click', async () => {
    if (!currentImageId) {
        alert('請先上傳文件');
        return;
    }

    recognizeBtn.disabled = true;
    recognizeBtn.textContent = '識別中...';

    try {
        const formData = new FormData();
        formData.append('image_id', currentImageId);
        formData.append('table_type', tableTypeSelect.value);

        // 如果有選取區域，傳遞座標
        if (selectionRect) {
            formData.append('x', selectionRect.x);
            formData.append('y', selectionRect.y);
            formData.append('width', selectionRect.width);
            formData.append('height', selectionRect.height);
        } else {
            formData.append('x', 0);
            formData.append('y', 0);
            formData.append('width', 0);
            formData.append('height', 0);
        }

        const response = await fetch(`${API_BASE}/api/recognize`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('識別失敗');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || '識別失敗');
        }

        // 顯示結果
        tableResults = data.tables;
        showResults(tableResults);

    } catch (error) {
        alert(`錯誤: ${error.message}`);
        console.error(error);
    } finally {
        recognizeBtn.disabled = false;
        recognizeBtn.textContent = '開始識別';
    }
});

// ============================================
// 顯示結果
// ============================================

function showResults(tables) {
    // 顯示結果區域
    previewSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    // 清空舊結果
    resultContainer.innerHTML = '';

    if (!tables || tables.length === 0) {
        resultContainer.innerHTML = '<p class="text-gray-600">未識別到表格</p>';
        return;
    }

    // 渲染表格
    tables.forEach((table, index) => {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'mb-6';

        const title = document.createElement('h3');
        title.className = 'text-lg font-semibold mb-2';
        title.textContent = `表格 ${index + 1}`;
        tableDiv.appendChild(title);

        const tableEl = document.createElement('table');
        tableEl.className = 'result-table';

        table.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            row.forEach(cell => {
                const td = rowIndex === 0 ? document.createElement('th') : document.createElement('td');
                td.textContent = cell || '';
                tr.appendChild(td);
            });

            tableEl.appendChild(tr);
        });

        tableDiv.appendChild(tableEl);
        resultContainer.appendChild(tableDiv);
    });
}

// ============================================
// 匯出功能
// ============================================

function tablesToCSV(tables) {
    return tables.map(table => {
        return table.map(row => {
            return row.map(cell => {
                // CSV 轉義：如果包含逗號或引號，用雙引號包裹
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',');
        }).join('\n');
    }).join('\n\n');
}

// 複製到剪貼簿
copyBtn.addEventListener('click', () => {
    if (!tableResults) return;

    const csv = tablesToCSV(tableResults);

    navigator.clipboard.writeText(csv).then(() => {
        alert('✅ 已複製到剪貼簿');
    }).catch(err => {
        console.error('複製失敗:', err);
        alert('❌ 複製失敗');
    });
});

// 下載 CSV
downloadBtn.addEventListener('click', () => {
    if (!tableResults) return;

    const csv = tablesToCSV(tableResults);

    // 添加 BOM 以支援中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `table_recognition_${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
});

// 上傳新文件
newUploadBtn.addEventListener('click', () => {
    currentImageId = null;
    currentImageData = null;
    selectionRect = null;
    tableResults = null;

    uploadSection.classList.remove('hidden');
    previewSection.classList.add('hidden');
    resultSection.classList.add('hidden');
});

// ============================================
// 拖放上傳支援
// ============================================

const dropZone = uploadSection.querySelector('div[class*="border-dashed"]');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

console.log('✅ 表格辨識應用已載入 - Linus 式極簡版');