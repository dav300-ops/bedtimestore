import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Determine NODE_ENV early
const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProd = nodeEnv === 'production';

// Load appropriate .env file if present
const rootDir = process.cwd();
if (isProd) {
  if (fs.existsSync(path.join(rootDir, '.env.production'))) {
    dotenv.config({ path: path.join(rootDir, '.env.production') });
  } else if (fs.existsSync(path.join(rootDir, '.env'))) {
    dotenv.config({ path: path.join(rootDir, '.env') });
  }
} else {
  if (fs.existsSync(path.join(rootDir, '.env.development'))) {
    dotenv.config({ path: path.join(rootDir, '.env.development') });
  } else if (fs.existsSync(path.join(rootDir, '.env'))) {
    dotenv.config({ path: path.join(rootDir, '.env') });
  }
}

// Helper to parse database credentials from URI or discrete variables
function parseDatabaseConfig() {
  const uri = process.env.MYSQL_URI || process.env.DATABASE_URL;
  if (uri && (uri.startsWith('mysql://') || uri.startsWith('mysql2://'))) {
    try {
      const parsed = new URL(uri);
      return {
        host: parsed.hostname || 'localhost',
        port: Number(parsed.port || 3306),
        user: parsed.username || 'thebedtime_str',
        password: parsed.password || '',
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'thebedtime_store',
      };
    } catch {
      // Fallback to discrete variables
    }
  }

  return {
    host: process.env.DB_HOST || process.env.MYSQL_HOST || (isProd ? '' : 'localhost'),
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
    user: process.env.DB_USER || process.env.MYSQL_USER || (isProd ? '' : 'thebedtime_str'),
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD || (isProd ? '' : 'zZ48ByGhTn7385hdjd')),
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || (isProd ? '' : 'thebedtime_store'),
  };
}

const parsedDb = parseDatabaseConfig();

export const config = {
  env: nodeEnv,
  isProd,
  isDev: !isProd,
  port: Number(process.env.PORT || 3000),
  db: {
    host: parsedDb.host,
    port: parsedDb.port,
    user: parsedDb.user,
    password: parsedDb.password,
    database: parsedDb.database,
    ssl: process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true',
  },
  corsOrigin: process.env.CORS_ORIGIN || (isProd ? 'https://thebedtime.store' : 'http://localhost:3000'),
  clientApiBaseUrl: process.env.VITE_API_BASE_URL || '',
  appVersion: process.env.VITE_APP_VERSION || process.env.APP_VERSION || 'v1.0.0',
  cacheTtlMs: isProd ? 10 * 60 * 1000 : 60 * 1000, // 10 minutes prod, 1 minute dev
};

/**
 * Validates required environment variables on startup.
 * Exits with clear message if required variables are missing in production.
 */
export function validateEnvironment(): void {
  const missing: string[] = [];

  if (isProd) {
    if (!config.db.host) missing.push('DB_HOST (or MYSQL_HOST / MYSQL_URI)');
    if (!config.db.user) missing.push('DB_USER (or MYSQL_USER / MYSQL_URI)');
    if (!config.db.database) missing.push('DB_NAME (or MYSQL_DATABASE / MYSQL_URI)');
    if (!process.env.CORS_ORIGIN) missing.push('CORS_ORIGIN');

    if (missing.length > 0) {
      console.error('================================================================================');
      console.error('[CONFIG FATAL ERROR] Missing required production environment variables:');
      missing.forEach((item) => console.error(`  - ${item}`));
      console.error('\nPlease define these variables in your deployment environment or .env.production.');
      console.error('================================================================================');
      process.exit(1);
    }
  } else {
    // Development verification
    const devWarnings: string[] = [];
    if (!config.db.host) devWarnings.push('DB_HOST');
    if (!config.db.user) devWarnings.push('DB_USER');
    if (!config.db.database) devWarnings.push('DB_NAME');

    if (devWarnings.length > 0) {
      console.warn(`[Config Notice] Running in development mode with local fallback defaults for: ${devWarnings.join(', ')}.`);
    }
  }
}

/**
 * Sanitizes objects and logs to prevent leaking passwords, tokens, or private secrets.
 */
export function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const SENSITIVE_KEYS = [
    'password',
    'password_hash',
    'pass',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'cookie',
    'secret',
    'cvv',
    'cardnumber',
    'card_number',
    'creditcard',
  ];

  const copy: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      copy[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      copy[key] = sanitizeData(value);
    } else {
      copy[key] = value;
    }
  }
  return copy;
}
