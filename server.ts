import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config, validateEnvironment, sanitizeData } from './server/config';
import { connectToDatabase, closePool } from './server/db';
import { inventoryService } from './server/services/inventoryService';
import { categoryService } from './server/services/categoryService';
import { authService } from './server/services/authService';
import { salesService } from './server/services/salesService';
import { orderService } from './server/services/orderService';
import apiRouter from './server/routes/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // 1. Validate required environment variables on startup
  validateEnvironment();

  const app = express();
  const PORT = config.port;

  // 2. Security Headers via Helmet (with CSP disabled for preview iframe compatibility)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 3. CORS Configuration
  if (config.isProd) {
    app.use(
      cors({
        origin: config.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      })
    );
  } else {
    // Development allows all origins for ease of testing
    app.use(cors());
  }

  // 4. Rate Limiting (Strict in Production, Relaxed in Development)
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.isProd ? 30 : 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' },
  });

  const writeRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: config.isProd ? 120 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many write requests. Please try again later.' },
    skip: (req) => req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD',
  });

  // Apply rate limits
  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/register', authRateLimiter);
  app.use('/api', writeRateLimiter);

  // 5. Logging Middleware (Verbose in Dev, Sanitized & Leank in Production)
  app.use((req, res, next) => {
    const startTime = Date.now();
    if (config.isDev) {
      console.log(`[DEV API] ${req.method} ${req.url}`);
    }

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      if (config.isDev) {
        console.log(`[DEV RES] ${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms)`);
      } else {
        // Production logging: strictly logs method, path, status, and duration (never secrets or full body payloads)
        console.log(`[PROD] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${durationMs}ms`);
      }
    });

    next();
  });

  // 6. Body Parsers with 25MB limit for high-resolution base64 images
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // 7. Mount Core API Router
  app.use('/api', apiRouter);

  // 8. Connect to Database (with automatic pooling, fallback, and schema seeding)
  connectToDatabase()
    .then(async () => {
      await authService.seedDefaultUsers();
      await categoryService.seedIfNeeded();
      await inventoryService.seedIfNeeded();
      await orderService.seedIfNeeded();
      await salesService.seedInitialSalesIfNeeded();
      console.log('[MySQL] Database bootstrap and catalog seeding complete.');
    })
    .catch((err) => {
      console.warn('[MySQL] Initialization notice:', err?.message || err);
    });

  // 9. Static Assets & Frontend Routing (Development vs Production)
  if (config.isProd) {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      console.log(`[Server] Serving production static bundle from: ${distPath}`);
      app.use(express.static(distPath));
      // SPA Fallback: non-API routes return dist/index.html
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('[Server] Production dist directory not found. Please run "npm run build".');
      app.use((_req, res) => {
        res.status(503).json({
          error: 'Production bundle not found. Please build the application using npm run build.',
        });
      });
    }
  } else {
    // Development Mode: Mount Vite Middleware
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite development middleware mounted successfully.');
    } catch (viteErr) {
      console.error('[Server] Failed to initialize Vite middleware:', viteErr);
    }
  }

  // 10. Start Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[THE BEDTIME STORE] Server running in ${config.env.toUpperCase()} mode at http://0.0.0.0:${PORT}`);
  });

  // 11. Graceful Shutdown on SIGTERM and SIGINT
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await closePool();
      console.log('[Server] Cleanup finished. Exiting.');
      process.exit(0);
    });

    // Enforce shutdown after 10s if connections linger
    setTimeout(() => {
      console.error('[Server] Graceful shutdown timeout reached. Terminating forcefully.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
