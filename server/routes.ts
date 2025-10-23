import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const upload = multer({
  dest: "uploads/",
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
    // 使用 300 DPI 提高圖片解析度，對數據密集的表格效果更好
    const command = `pdftoppm -png -r 300 "${pdfPath}" "${outputPrefix}"`;
    
    await execAsync(command);
    
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
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "server", "table_recognition.py");
    const imagePathsStr = imagePaths.join(",");
    
    const python = spawn("python3", [pythonScript, imagePathsStr]);
    
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
  });
}

async function cropImage(imagePath: string, x: number, y: number, width: number, height: number): Promise<string> {
  const outputPath = imagePath.replace(/\.png$/, `_crop_${Date.now()}.png`);
  
  try {
    // 使用 Python + Pillow 裁切圖片
    const pythonScript = path.join(process.cwd(), "server", "crop_image.py");
    const command = `python3 "${pythonScript}" "${imagePath}" "${outputPath}" ${x} ${y} ${width} ${height}`;
    
    await execAsync(command);
    
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
const uploadedFiles = new Map<string, { imagePaths: string[]; uploadedFilePath: string; tempImageDir: string | null }>();

export async function registerRoutes(app: Express): Promise<Server> {
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
        tempImageDir
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
