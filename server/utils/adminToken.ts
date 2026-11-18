import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  mustChangePassword?: boolean;
  iat: number;
  exp: number;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSigningSecret(): string {
  if (process.env.ADMIN_TOKEN_SECRET && process.env.ADMIN_TOKEN_SECRET.trim()) {
    return process.env.ADMIN_TOKEN_SECRET.trim();
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET.trim();
  }
  // Derive a deterministic server-only HMAC key from environment config
  const material = `${config.db.host}:${config.db.database}:${config.db.user}:${config.db.password}:bedtime-admin-hmac`;
  return crypto.createHash('sha256').update(material).digest('hex');
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signAdminToken(admin: {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  mustChangePassword?: boolean;
}): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'BDS-ADMIN' }));
  const now = Date.now();
  const payload: AdminTokenPayload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    mustChangePassword: Boolean(admin.mustChangePassword),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${encodedPayload}`;
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', getSigningSecret()).update(signingInput).digest()
  );
  return `${signingInput}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, encodedPayload, sig] = parts;
    const signingInput = `${header}.${encodedPayload}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', getSigningSecret()).update(signingInput).digest()
    );

    const sigBuf = Buffer.from(sig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminTokenPayload;
    if (!payload?.id || !payload?.email) return null;
    if (payload.role !== 'admin' && payload.role !== 'superadmin') return null;
    if (!payload.exp || Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Administrator authentication required.',
      code: 'ADMIN_AUTH_REQUIRED',
    });
  }

  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Invalid or expired administrator session. Please sign in at /admin/login.',
      code: 'ADMIN_TOKEN_INVALID',
    });
  }

  (req as any).adminUser = payload;
  return next();
}
