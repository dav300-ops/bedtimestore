import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config, validateEnvironment } from './server/config';
import { startConnectionManager, closePool } from './server/db';
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

  // 2. Security Headers via Helmet (configured for AI Studio preview iframe compatibility)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
      originAgentCluster: false,
    })
  );

  // Ensure iframe embedding is allowed in development / preview
  app.use((_req, res, next) => {
    res.removeHeader('X-Frame-Options');
    next();
  });

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

  // 5. Logging Middleware (Verbose in Dev, Sanitized & Lean in Production)
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

  // 7. Health check. Answered by THIS file, so you can tell which server is really running:
  //    open https://thebedtimestore.com/api/health after deploying.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, env: config.env, time: new Date().toISOString() });
  });

  // 8. Mount Core API Router
  app.use('/api', apiRouter);

  // 8b. Unmatched /api requests get a JSON 404 (never the SPA's index.html).
  //     This is what stops "Unexpected token '<'" errors in the frontend.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // 9. Product images.
  //    ADJUST these folders to wherever your app saves uploaded product images.
  const imageDirs = [
    path.join(__dirname, 'public', 'images'),
    path.join(__dirname, 'uploads', 'images'),
    path.join(__dirname, 'dist', 'images'),
  ];
  for (const dir of imageDirs) {
    if (fs.existsSync(dir)) {
      console.log(`[Server] Serving /images from: ${dir}`);
      app.use('/images', express.static(dir));
    }
  }
  // A missing image should be a plain 404, not index.html
  app.use('/images', (_req, res) => {
    res.status(404).end();
  });

  // 10. Connect to Database. Keeps retrying in the background if the DB is not up yet.
  //     Seeding runs only after a REAL connection (never against the in-memory demo store).
  const bootstrapData = async () => {
    await authService.seedDefaultUsers();
    await categoryService.seedIfNeeded();
    await inventoryService.seedIfNeeded();
    // Demo orders / demo sales would pollute a real store's reports: opt-in, and never in production by default
    if (!config.isProd || process.env.SEED_DEMO_DATA === 'true') {
      await orderService.seedIfNeeded();
      await salesService.seedInitialSalesIfNeeded();
    } else {
      console.log('Production: skipping demo orders/sales seeding (set SEED_DEMO_DATA=true to force).');
    }
    console.log('Database bootstrap and catalog seeding complete.');
  };
  startConnectionManager(bootstrapData).catch((err) => {
    console.error('Connection manager crashed:', err?.message || err);
  });

  // 11. Static Assets & Frontend Routing (Development vs Production)
  const distPath = path.join(__dirname, 'dist');

  const serveBuiltFrontend = () => {
    console.log(`[Server] Serving production static bundle from: ${distPath}`);
    app.use(express.static(distPath));
    // SPA fallback. Written without a '*' pattern so it works on both Express 4 and Express 5.
    // /api and /images were already handled above, so they never reach this.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  };

  if (config.isProd) {
    if (fs.existsSync(distPath)) {
      serveBuiltFrontend();
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
      // Common on hosting panels: NODE_ENV is not "production" and Vite (a devDependency) isn't installed.
      // Fall back to the built frontend instead of leaving Express's bare "Cannot GET".
      if (fs.existsSync(distPath)) {
        console.warn('[Server] Falling back to the built dist bundle. Set NODE_ENV=production on this host.');
        serveBuiltFrontend();
      }
    }
  }

  // 12. Final error handler: JSON instead of Express's HTML error page
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server] Unhandled error:', err?.message || err);
    res.status(err?.status || 500).json({ error: err?.message || 'Internal server error' });
  });

  // 13. Start Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[THE BEDTIME STORE] Server running in ${config.env.toUpperCase()} mode at http://0.0.0.0:${PORT}`);
  });

  // 14. Graceful Shutdown on SIGTERM and SIGINT
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