import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase } from './server/db';
import { inventoryService } from './server/services/inventoryService';
import { categoryService } from './server/services/categoryService';
import apiRouter from './server/routes/api';

import { authService } from './server/services/authService';
import { salesService } from './server/services/salesService';
import { orderService } from './server/services/orderService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Parse JSON and URL-encoded bodies with ample limit for image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount API Router before Vite middlewares
  app.use('/api', apiRouter);

  // // Connect to MySQL Relational Database (with resilient schema bootstrapping and fallback)
  // connectToDatabase()
  //   .then(async () => {
  //     await authService.seedDefaultUsers();
  //     await categoryService.seedIfNeeded();
  //     await inventoryService.seedIfNeeded();
  //     await orderService.seedIfNeeded();
  //     await salesService.seedInitialSalesIfNeeded();
  //   })
  //   .catch((err) => {
  //     console.warn('[MySQL] Initialization notice:', err);
  //   });

  // Vite Middleware Mode for Dev & Full-Stack Serving

  if (process.env.NODE_ENV === 'production') {
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
} else {

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
    } catch (viteErr) {
      console.error('[Server] Failed to initialize Vite middleware:', viteErr);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[THE BEDTIME STORE] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
