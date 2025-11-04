import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  log(`Checking for static files at: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    log(`❌ ERROR: Build directory not found at ${distPath}`);
    log(`Current directory: ${__dirname}`);
    log(`Make sure to run 'npm run build' before starting the server`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  log(`✅ Found static files at ${distPath}`);

  // Check if index.html exists
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    log(`❌ ERROR: index.html not found at ${indexPath}`);
    throw new Error(`index.html not found in build directory`);
  }

  log(`✅ index.html found at ${indexPath}`);

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(indexPath);
  });
}
