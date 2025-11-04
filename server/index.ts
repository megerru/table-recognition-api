import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./utils";

const app = express();

app.use((req, res, next) => {
  const allowedOrigins = [
    'https://megerru.github.io',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173' // Vite dev server
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`❌ Error: ${message}`, 'error-handler');
      console.error(err);

      res.status(status).json({ message });
      // Don't throw - that would crash the entire process
    });

    // Set NODE_ENV to production if not set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "production";
      log(`⚠️  NODE_ENV not set, defaulting to production`);
    }
    const isProduction = process.env.NODE_ENV === "production";
    log(`🚀 Starting application...`);
    log(`Environment: ${isProduction ? 'production' : 'development'}`);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (!isProduction) {
      log('Setting up Vite development server...');
      const { setupVite } = await import('./vite');
      await setupVite(app, server);
    } else {
      log('Serving static files from dist/public...');
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = '0.0.0.0';
    
    log(`Starting server on ${host}:${port}...`);
    
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`✅ Server successfully started and listening on ${host}:${port}`);
      log(`Environment: ${isProduction ? 'production' : 'development'}`);
    });

    // Add error handler for server startup
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`❌ Error: Port ${port} is already in use`);
      } else {
        log(`❌ Server error: ${error.message}`);
      }
      process.exit(1);
    });

  } catch (error: any) {
    log(`❌ Failed to start server: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
})();
