import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { spawn, execSync } from "child_process";

// 在啟動時找到 pdftoppm 的絕對路徑（Replit Nix 環境需要）
let PDFTOPPM_PATH = "pdftoppm";
try {
  PDFTOPPM_PATH = execSync("which pdftoppm", { encoding: "utf-8" }).trim();
  console.log(`✅ Found pdftoppm at: ${PDFTOPPM_PATH}`);
} catch (error) {
  console.warn("⚠️  Could not find pdftoppm via 'which', using PATH fallback");
}

// 配置 multer 儲存，保留檔案副檔名
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // 從原始檔名獲取副檔名，如果沒有則根據 MIME 類型推斷
    let ext = path.extname(file.originalname);
    if (!ext) {
      // 根據 MIME 類型推斷副檔名
      const mimeToExt: { [key: string]: string } = {
        'application/pdf': '.pdf',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg'
      };
      ext = mimeToExt[file.mimetype] || '.png';
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg"
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("只支援 PDF、PNG、JPG、JPEG 格式"));
    }
  },
});

interface TableRecognitionResult {
  tableIndex: number;
  pageNumber?: number;
  html: string;
  rows: string[][];
  confidence?: number;
  type?: string;
}

async function convertPdfToImages(pdfPath: string): Promise<string[]> {
  const outputDir = path.join("uploads", "images", path.basename(pdfPath, ".pdf"));

  try {
    await fs.mkdir(outputDir, { recursive: true });

    const outputPrefix = path.join(outputDir, "page");

    // 使用 spawn 避免命令注入，設置 2 分鐘超時
    await new Promise<void>((resolve, reject) => {
      const pdftoppm = spawn(PDFTOPPM_PATH, [
        "-png",
        "-r", "150", // 降低 DPI 以節省記憶體和處理時間
        pdfPath,
        outputPrefix
      ], {
        timeout: 2 * 60 * 1000 // 2 分鐘超時
      });

      let stderr = "";

      pdftoppm.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pdftoppm.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`PDF 轉換失敗: ${stderr || "未知錯誤"}`));
        } else {
          resolve();
        }
      });

      pdftoppm.on("error", (error) => {
        reject(new Error(`無法啟動 pdftoppm: ${error.message}`));
      });
    });

    const files = await fs.readdir(outputDir);
    const imageFiles = files
      .filter(f => f.endsWith(".png"))
      .map(f => path.join(outputDir, f))
      .sort();

    return imageFiles;
  } catch (error) {
    console.error("PDF 轉換錯誤:", error);
    throw new Error("PDF 轉圖片失敗");
  }
}

async function recognizeTables(imagePaths: string[]): Promise<TableRecognitionResult[]> {
  // 並發控制
  while (activeOcrProcesses >= MAX_OCR_PROCESSES) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  activeOcrProcesses++;

  try {
    return await new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), "server", "table_recognition.py");
      const imagePathsStr = imagePaths.join(",");

      const python = spawn("python3", [pythonScript, imagePathsStr], {
        timeout: 3 * 60 * 1000, // 3 分鐘超時
        env: process.env // 繼承完整環境變數
      });

      let stdout = "";
      let stderr = "";

      python.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      python.stderr.on("data", (data) => {
        const stderrText = data.toString();
        stderr += stderrText;
        // 即時顯示處理信息（旋轉、預處理等）
        console.log(stderrText.trim());
      });

      python.on("close", (code) => {
        if (code !== 0) {
          console.error("Python 错误:", stderr);
          reject(new Error(`表格識別失敗: ${stderr || "未知錯誤"}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.success) {
            resolve(result.tables || []);
          } else {
            reject(new Error(result.error || "識別失敗"));
          }
        } catch (error) {
          console.error("解析 JSON 错误:", error, "输出:", stdout);
          reject(new Error("解析識別結果失敗"));
        }
      });

      python.on("error", (error) => {
        reject(new Error(`無法啟動 Python: ${error.message}`));
      });
    });
  } finally {
    activeOcrProcesses--;
  }
}

async function cropImage(imagePath: string, x: number, y: number, width: number, height: number): Promise<string> {
  // 獲取副檔名，如果沒有則默認為 .png
  const ext = path.extname(imagePath) || '.png';
  const basePath = imagePath.replace(ext, '');
  const outputPath = `${basePath}_crop_${Date.now()}${ext}`;

  try {
    // 使用 spawn 避免命令注入，設置 30 秒超時
    await new Promise<void>((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), "server", "crop_image.py");
      const python = spawn("python3", [
        pythonScript,
        imagePath,
        outputPath,
        x.toString(),
        y.toString(),
        width.toString(),
        height.toString()
      ], {
        timeout: 30 * 1000, // 30 秒超時
        env: process.env // 繼承完整環境變數
      });

      let stderr = "";

      python.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`圖片裁切失敗: ${stderr || "未知錯誤"}`));
        } else {
          resolve();
        }
      });

      python.on("error", (error) => {
        reject(new Error(`無法啟動 Python: ${error.message}`));
      });
    });

    return outputPath;
  } catch (error) {
    console.error("圖片裁切失敗:", error);
    throw new Error("圖片裁切失敗");
  }
}

async function cleanupFiles(paths: string[]) {
  for (const filePath of paths) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error(`清理檔案失敗: ${filePath}`, error);
    }
  }
}

// 儲存上傳的文件信息（臨時存儲，實際應用中應使用 Redis 等）
interface SessionData {
  imagePaths: string[];
  uploadedFilePath: string;
  tempImageDir: string | null;
  createdAt: number;
}

const uploadedFiles = new Map<string, SessionData>();
const SESSION_TTL = 30 * 60 * 1000; // 30 分鐘

// 並發控制：限制同時運行的 OCR 進程數
let activeOcrProcesses = 0;
const MAX_OCR_PROCESSES = 1; // 容器環境降低並發以節省記憶體

// 確保 uploads 目錄存在
async function ensureUploadsDir() {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const imagesDir = path.join(uploadsDir, "images");

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
    console.log(`✅ Uploads directory ready: ${uploadsDir}`);
  } catch (error) {
    console.error(`❌ Failed to create uploads directory:`, error);
    throw error;
  }
}

// 定期清理過期的 session
function startSessionCleaner() {
  setInterval(async () => {
    const now = Date.now();
    const expired: string[] = [];

    for (const [sessionId, data] of uploadedFiles.entries()) {
      if (now - data.createdAt > SESSION_TTL) {
        expired.push(sessionId);
      }
    }

    for (const sessionId of expired) {
      const data = uploadedFiles.get(sessionId);
      if (data) {
        const filesToClean = [data.uploadedFilePath];
        if (data.tempImageDir) {
          filesToClean.push(data.tempImageDir);
        }
        await cleanupFiles(filesToClean);
        uploadedFiles.delete(sessionId);
        console.log(`🧹 Cleaned up expired session: ${sessionId}`);
      }
    }
  }, 5 * 60 * 1000); // 每 5 分鐘清理一次
}

// 清理舊文件（啟動時執行）
async function cleanupOldFiles() {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = await fs.readdir(uploadsDir);
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > ONE_HOUR) {
          if (stats.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
          cleaned++;
        }
      } catch (error) {
        // 忽略單個文件的錯誤
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old files from uploads directory`);
    }
  } catch (error) {
    console.error(`⚠️  Failed to cleanup old files:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 確保目錄存在並清理舊文件
  await ensureUploadsDir();
  await cleanupOldFiles();

  // 啟動定期清理器
  startSessionCleaner();
  // 新的上傳 API：只轉換，不識別
  app.post("/api/upload-preview", upload.single("file"), async (req, res) => {
    let imagePaths: string[] = [];
    let uploadedFilePath: string | null = null;
    let tempImageDir: string | null = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "未上傳檔案",
        });
      }
      
      uploadedFilePath = req.file.path;
      const originalName = req.file.originalname;
      const mimeType = req.file.mimetype;
      
      console.log(`開始處理檔案: ${originalName}, 類型: ${mimeType}`);
      
      // 檢查是圖片還是 PDF
      if (mimeType.startsWith("image/")) {
        // 如果是圖片，直接使用
        imagePaths = [uploadedFilePath];
        console.log(`圖片檔案已準備好預覽`);
      } else if (mimeType === "application/pdf") {
        // 如果是 PDF，轉換為圖片
        imagePaths = await convertPdfToImages(uploadedFilePath);
        tempImageDir = path.dirname(imagePaths[0]);
        console.log(`PDF 轉換完成，共 ${imagePaths.length} 頁`);
        
        if (imagePaths.length === 0) {
          throw new Error("PDF 轉換失敗，未生成圖片");
        }
      } else {
        throw new Error("不支援的檔案格式");
      }
      
      // 生成唯一 ID
      const sessionId = Date.now().toString();

      // 儲存文件信息
      uploadedFiles.set(sessionId, {
        imagePaths,
        uploadedFilePath,
        tempImageDir,
        createdAt: Date.now()
      });
      
      // 返回圖片 URL 供前端預覽
      const imageUrls = imagePaths.map((imgPath, index) => ({
        url: `/api/preview-image/${sessionId}/${index}`,
        pageNumber: index + 1
      }));
      
      return res.json({
        success: true,
        sessionId,
        images: imageUrls,
        filename: originalName,
        message: `已轉換 ${imagePaths.length} 頁，請框選要識別的區域`,
      });
      
    } catch (error) {
      console.error("處理錯誤:", error);
      
      // 清理檔案
      const filesToClean = [];
      if (uploadedFilePath) {
        filesToClean.push(uploadedFilePath);
      }
      if (tempImageDir) {
        filesToClean.push(tempImageDir);
      }
      await cleanupFiles(filesToClean);
      
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "處理檔案時出錯",
      });
    }
  });
  
  // 提供圖片預覽
  app.get("/api/preview-image/:sessionId/:pageIndex", (req, res) => {
    const { sessionId, pageIndex } = req.params;
    const fileInfo = uploadedFiles.get(sessionId);
    
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: "找不到上傳的檔案"
      });
    }
    
    const index = parseInt(pageIndex);
    if (index < 0 || index >= fileInfo.imagePaths.length) {
      return res.status(404).json({
        success: false,
        message: "頁碼不存在"
      });
    }
    
    const imagePath = fileInfo.imagePaths[index];
    res.sendFile(path.resolve(imagePath));
  });
  
  // 區域識別 API
  app.post("/api/recognize-regions", async (req, res) => {
    try {
      const { sessionId, regions } = req.body;
      
      if (!sessionId || !regions || !Array.isArray(regions)) {
        return res.status(400).json({
          success: false,
          message: "缺少必要參數"
        });
      }
      
      const fileInfo = uploadedFiles.get(sessionId);
      if (!fileInfo) {
        return res.status(404).json({
          success: false,
          message: "找不到上傳的檔案"
        });
      }
      
      // 裁切並識別每個區域
      const results = [];
      for (const region of regions) {
        const { pageIndex, x, y, width, height } = region;
        const imagePath = fileInfo.imagePaths[pageIndex];
        
        // 裁切圖片
        const croppedPath = await cropImage(imagePath, x, y, width, height);
        
        // 識別裁切後的圖片
        const tables = await recognizeTables([croppedPath]);
        
        results.push(...tables);
        
        // 清理裁切的圖片
        await cleanupFiles([croppedPath]);
      }
      
      // 清理原始檔案
      const filesToClean = [fileInfo.uploadedFilePath];
      if (fileInfo.tempImageDir) {
        filesToClean.push(fileInfo.tempImageDir);
      }
      await cleanupFiles(filesToClean);
      
      // 從記憶體中移除
      uploadedFiles.delete(sessionId);
      
      return res.json({
        success: true,
        tables: results,
        message: `成功識別 ${results.length} 個表格`
      });
      
    } catch (error) {
      console.error("區域識別錯誤:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "識別失敗"
      });
    }
  });
  
  // 舊的上傳 API（保留兼容性）
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    let imagePaths: string[] = [];
    let uploadedFilePath: string | null = null;
    let tempImageDir: string | null = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "未上傳檔案",
        });
      }
      
      uploadedFilePath = req.file.path;
      const originalName = req.file.originalname;
      const mimeType = req.file.mimetype;
      
      console.log(`開始處理檔案: ${originalName}, 類型: ${mimeType}`);
      
      // 檢查是圖片還是 PDF
      if (mimeType.startsWith("image/")) {
        // 如果是圖片，直接使用
        imagePaths = [uploadedFilePath];
        console.log(`圖片檔案已準備好進行識別`);
      } else if (mimeType === "application/pdf") {
        // 如果是 PDF，轉換為圖片
        imagePaths = await convertPdfToImages(uploadedFilePath);
        tempImageDir = path.dirname(imagePaths[0]);
        console.log(`PDF 轉換完成，共 ${imagePaths.length} 頁`);
        
        if (imagePaths.length === 0) {
          throw new Error("PDF 轉換失敗，未生成圖片");
        }
      } else {
        throw new Error("不支援的檔案格式");
      }
      
      const tables = await recognizeTables(imagePaths);
      console.log(`表格識別完成，共 ${tables.length} 個表格`);
      
      // 清理檔案
      const filesToClean = [uploadedFilePath];
      if (tempImageDir) {
        filesToClean.push(tempImageDir);
      }
      await cleanupFiles(filesToClean);
      
      return res.json({
        success: true,
        tables,
        filename: originalName,
        message: `成功識別 ${tables.length} 個表格`,
      });
      
    } catch (error) {
      console.error("處理錯誤:", error);
      
      // 清理檔案
      const filesToClean = [];
      if (uploadedFilePath) {
        filesToClean.push(uploadedFilePath);
      }
      if (tempImageDir) {
        filesToClean.push(tempImageDir);
      }
      await cleanupFiles(filesToClean);
      
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "處理檔案時出錯",
      });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "服務運行正常" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
