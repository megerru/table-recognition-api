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
    const command = `pdftoppm -png "${pdfPath}" "${outputPrefix}"`;
    
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
      stderr += data.toString();
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

export async function registerRoutes(app: Express): Promise<Server> {
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
