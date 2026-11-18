import crypto from 'crypto';
import { config } from '../config';
import { executeQuery } from '../db';
import { getSigningSecret, signAdminToken } from '../utils/adminToken';
import { authService, MySQLUser } from './authService';
import { sendAdminOtpEmail, sendAdminOtpLoginAlertEmail } from './emailService';
import {
  SQL_FIND_USER_BY_EMAIL,
  SQL_FIND_USER_BY_ID,
  SQL_INSERT_OTP_CHALLENGE,
  SQL_FIND_OTP_CHALLENGE_BY_ID,
  SQL_INVALIDATE_ADMIN_ACTIVE_OTPS,
  SQL_INCREMENT_OTP_ATTEMPTS,
  SQL_INVALIDATE_OTP_CHALLENGE,
  SQL_MARK_OTP_USED,
  SQL_COUNT_RECENT_OTP_BY_EMAIL,
  SQL_COUNT_RECENT_OTP_BY_IP,
} from '../queries/mysqlQueries';

const GENERIC_OTP_MESSAGE = 'If this email is registered, a code has been sent.';
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_REQUESTS_PER_EMAIL_15M = 3;
const MAX_REQUESTS_PER_IP_1H = 10;
const MAX_VERIFY_ATTEMPTS_PER_CODE = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const IP_WINDOW_MS = 60 * 60 * 1000;
const MIN_CONSTANT_RESPONSE_MS = 500;

interface RateEntry {
  timestamps: number[];
}

interface LockoutEntry {
  failures: number;
  lockedUntil: number | null;
}

interface DummyChallengeRecord {
  id: string;
  email: string;
  maskedEmail: string;
  language: string;
  lastSentAt: number;
  expiresAt: number;
  attempts: number;
  invalidated: boolean;
}

// Server-side in-memory trackers complementing DB counts (covers unknown/dummy emails too!)
const emailRequestTracker = new Map<string, RateEntry>();
const ipRequestTracker = new Map<string, RateEntry>();
const emailCooldownTracker = new Map<string, number>();
const verifyLockoutTracker = new Map<string, LockoutEntry>();
const dummyChallenges = new Map<string, DummyChallengeRecord>();

export function resetOtpRateLimitStateForTesting(): void {
  emailRequestTracker.clear();
  ipRequestTracker.clear();
  emailCooldownTracker.clear();
  verifyLockoutTracker.clear();
  dummyChallenges.clear();
}

function getOtpHmacKey(): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update('bedtime-admin-otp-hmac-v1')
    .digest('hex');
}

function hashOtpCode(challengeDbId: string, code: string): string {
  return crypto
    .createHmac('sha256', getOtpHmacKey())
    .update(`${challengeDbId}:${code}`)
    .digest('hex');
}

function signChallengeId(challengeDbId: string): string {
  const sig = crypto
    .createHmac('sha256', getOtpHmacKey())
    .update(`challenge:${challengeDbId}`)
    .digest('hex')
    .slice(0, 32);
  return `${challengeDbId}.${sig}`;
}

function verifyAndExtractChallengeId(challengeToken: string): string | null {
  if (!challengeToken || typeof challengeToken !== 'string') return null;
  const parts = challengeToken.split('.');
  if (parts.length !== 2) return null;
  const [challengeDbId, sig] = parts;
  if (!challengeDbId || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getOtpHmacKey())
    .update(`challenge:${challengeDbId}`)
    .digest('hex')
    .slice(0, 32);

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  return challengeDbId;
}

export function maskEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const [local, domain] = clean.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function isDomainAllowed(email: string): boolean {
  const allowed = config.otp.allowedDomains;
  if (!allowed || allowed.length === 0) return true;
  const domain = (email.split('@')[1] || '').toLowerCase();
  return allowed.includes(domain);
}

function pruneTimestamps(map: Map<string, RateEntry>, key: string, windowMs: number): number[] {
  const now = Date.now();
  const entry = map.get(key);
  const fresh = (entry?.timestamps || []).filter((ts) => now - ts < windowMs);
  map.set(key, { timestamps: fresh });
  return fresh;
}

function recordRequestTimestamp(map: Map<string, RateEntry>, key: string, windowMs: number): void {
  const list = pruneTimestamps(map, key, windowMs);
  list.push(Date.now());
  map.set(key, { timestamps: list });
}

function checkLockout(key: string): { locked: boolean; remainingSeconds: number } {
  const entry = verifyLockoutTracker.get(key);
  if (!entry) return { locked: false, remainingSeconds: 0 };
  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    verifyLockoutTracker.delete(key);
  }
  return { locked: false, remainingSeconds: 0 };
}

function recordVerifyFailure(key: string): void {
  const current = verifyLockoutTracker.get(key) || { failures: 0, lockedUntil: null };
  const nextFailures = current.failures + 1;
  verifyLockoutTracker.set(key, {
    failures: nextFailures,
    lockedUntil: nextFailures >= MAX_VERIFY_ATTEMPTS_PER_CODE ? Date.now() + LOCKOUT_WINDOW_MS : current.lockedUntil,
  });
}

function clearVerifyFailures(key: string): void {
  verifyLockoutTracker.delete(key);
}

function cleanExpiredDummyChallenges(): void {
  const now = Date.now();
  for (const [k, v] of dummyChallenges.entries()) {
    if (now > v.expiresAt + 5 * 60 * 1000) {
      dummyChallenges.delete(k);
    }
  }
}

async function padResponseTime(startTimeMs: number, minMs = MIN_CONSTANT_RESPONSE_MS): Promise<void> {
  if (process.env.OTP_SKIP_TIMING_PAD === 'true') return;
  const elapsed = Date.now() - startTimeMs;
  const remaining = minMs - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function makeHttpError(status: number, message: string, code: string, extra?: Record<string, any>): Error & Record<string, any> {
  const err: any = new Error(message);
  err.status = status;
  err.code = code;
  if (extra) Object.assign(err, extra);
  return err;
}

function ensureOtpFeatureEnabled(): void {
  if (!config.otp.enabled) {
    throw makeHttpError(403, 'Email code sign-in is currently disabled.', 'OTP_DISABLED');
  }
}

export class AdminOtpService {
  private async enforceRequestLimits(email: string, ip: string): Promise<void> {
    const emailKey = email.toLowerCase().trim();
    const ipKey = ip.trim() || '127.0.0.1';

    // Check failure lockout
    const emailLock = checkLockout(`email:${emailKey}`);
    if (emailLock.locked) {
      throw makeHttpError(
        429,
        `Too many failed verification attempts. Please wait ${Math.ceil(emailLock.remainingSeconds / 60)} minute(s) or sign in with your password.`,
        'OTP_LOCKED',
        { retryAfterSeconds: emailLock.remainingSeconds }
      );
    }
    const ipLock = checkLockout(`ip:${ipKey}`);
    if (ipLock.locked) {
      throw makeHttpError(
        429,
        `Too many failed verification attempts. Please wait ${Math.ceil(ipLock.remainingSeconds / 60)} minute(s).`,
        'OTP_LOCKED',
        { retryAfterSeconds: ipLock.remainingSeconds }
      );
    }

    // Check 60s cooldown for this email
    const lastSentAt = emailCooldownTracker.get(emailKey);
    if (lastSentAt) {
      const elapsedSec = Math.floor((Date.now() - lastSentAt) / 1000);
      if (elapsedSec < RESEND_COOLDOWN_SECONDS) {
        const retryAfterSeconds = RESEND_COOLDOWN_SECONDS - elapsedSec;
        throw makeHttpError(
          429,
          `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          'OTP_COOLDOWN',
          { retryAfterSeconds }
        );
      }
    }

    // Check 3 per 15 min per email (in-memory + DB)
    const recentMemoryEmail = pruneTimestamps(emailRequestTracker, emailKey, EMAIL_WINDOW_MS).length;
    const dbEmailRows = await executeQuery<{ total: number }>(SQL_COUNT_RECENT_OTP_BY_EMAIL, [emailKey]);
    const recentDbEmail = Number(dbEmailRows?.[0]?.total || 0);
    if (Math.max(recentMemoryEmail, recentDbEmail) >= MAX_REQUESTS_PER_EMAIL_15M) {
      throw makeHttpError(
        429,
        'Too many code requests for this email. Please wait 15 minutes before trying again.',
        'OTP_EMAIL_RATE_LIMIT',
        { retryAfterSeconds: 15 * 60 }
      );
    }

    // Check 10 per hour per IP (in-memory + DB)
    const recentMemoryIp = pruneTimestamps(ipRequestTracker, ipKey, IP_WINDOW_MS).length;
    const dbIpRows = await executeQuery<{ total: number }>(SQL_COUNT_RECENT_OTP_BY_IP, [ipKey]);
    const recentDbIp = Number(dbIpRows?.[0]?.total || 0);
    if (Math.max(recentMemoryIp, recentDbIp) >= MAX_REQUESTS_PER_IP_1H) {
      throw makeHttpError(
        429,
        'Too many code requests from this network. Please wait before trying again.',
        'OTP_IP_RATE_LIMIT',
        { retryAfterSeconds: 60 * 60 }
      );
    }
  }

  private async issueCodeForEligibleAdmin(
    rawAdmin: any,
    language: string,
    meta: { ip: string; device: string }
  ): Promise<{ challengeId: string; expiresInSeconds: number }> {
    const expiryMinutes = config.otp.expiryMinutes;
    const expiresInSeconds = expiryMinutes * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Invalidate all previous active challenges for this admin
    await executeQuery(SQL_INVALIDATE_ADMIN_ACTIVE_OTPS, [rawAdmin.id]);

    // Cryptographically secure 6-digit code
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challengeDbId = `otp-${crypto.randomBytes(12).toString('hex')}`;
    const codeHash = hashOtpCode(challengeDbId, code);

    await executeQuery(SQL_INSERT_OTP_CHALLENGE, [
      challengeDbId,
      rawAdmin.id,
      rawAdmin.email,
      codeHash,
      language,
      expiresAt,
      meta.ip,
      meta.device.slice(0, 250),
    ]);

    await authService.logSecurityEvent({
      userId: rawAdmin.id,
      action: 'otp_requested',
      ip: meta.ip,
      location: 'Manama, Bahrain',
      device: meta.device,
    });

    try {
      await sendAdminOtpEmail({
        to: rawAdmin.email,
        code,
        expiryMinutes,
        language,
        requestIp: meta.ip,
        device: meta.device,
        requestedAt: new Date(),
      });
    } catch (smtpErr: any) {
      // Do not leave an undelivered code active
      await executeQuery(SQL_INVALIDATE_OTP_CHALLENGE, [challengeDbId]);
      throw makeHttpError(
        503,
        'Unable to deliver the verification code email right now. Please try signing in with your password or try again shortly.',
        'SMTP_UNAVAILABLE'
      );
    }

    await authService.logSecurityEvent({
      userId: rawAdmin.id,
      action: 'otp_sent',
      ip: meta.ip,
      location: 'Manama, Bahrain',
      device: meta.device,
    });

    return {
      challengeId: signChallengeId(challengeDbId),
      expiresInSeconds,
    };
  }

  public async requestOtp(
    emailInput: string,
    languageInput: string | undefined,
    meta: { ip: string; device: string }
  ): Promise<{
    message: string;
    challengeId: string;
    maskedEmail: string;
    expiresInSeconds: number;
    cooldownSeconds: number;
  }> {
    ensureOtpFeatureEnabled();
    const startTime = Date.now();
    const cleanEmail = String(emailInput || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw makeHttpError(400, 'Please enter a valid email address.', 'INVALID_EMAIL');
    }

    const language = languageInput || 'en';
    await this.enforceRequestLimits(cleanEmail, meta.ip);

    // Count this request toward per-email & per-IP limits regardless of existence (anti-enumeration)
    recordRequestTimestamp(emailRequestTracker, cleanEmail, EMAIL_WINDOW_MS);
    recordRequestTimestamp(ipRequestTracker, meta.ip || '127.0.0.1', IP_WINDOW_MS);
    emailCooldownTracker.set(cleanEmail, Date.now());

    const rows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [cleanEmail]);
    const rawUser = rows?.[0];

    const isAdminAccount =
      rawUser &&
      (rawUser.role === 'admin' || rawUser.role === 'superadmin') &&
      !rawUser.is_guest;
    const perAdminOtpAllowed =
      rawUser && (rawUser.otp_login_enabled === undefined ? true : Boolean(rawUser.otp_login_enabled));
    const domainAllowed = isDomainAllowed(cleanEmail);

    if (isAdminAccount && perAdminOtpAllowed && domainAllowed) {
      const issued = await this.issueCodeForEligibleAdmin(rawUser, language, meta);
      await padResponseTime(startTime);
      return {
        message: GENERIC_OTP_MESSAGE,
        challengeId: issued.challengeId,
        maskedEmail: maskEmail(cleanEmail),
        expiresInSeconds: issued.expiresInSeconds,
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      };
    }

    // Non-admin / unknown / disabled / blocked domain: execute dummy HMAC + uniform timing floor
    cleanExpiredDummyChallenges();
    const dummyDbId = `otpd-${crypto.randomBytes(12).toString('hex')}`;
    hashOtpCode(dummyDbId, '000000');
    const expiresInSeconds = config.otp.expiryMinutes * 60;

    dummyChallenges.set(dummyDbId, {
      id: dummyDbId,
      email: cleanEmail,
      maskedEmail: maskEmail(cleanEmail),
      language,
      lastSentAt: Date.now(),
      expiresAt: Date.now() + expiresInSeconds * 1000,
      attempts: 0,
      invalidated: false,
    });

    await padResponseTime(startTime);
    return {
      message: GENERIC_OTP_MESSAGE,
      challengeId: signChallengeId(dummyDbId),
      maskedEmail: maskEmail(cleanEmail),
      expiresInSeconds,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }

  public async resendOtp(
    challengeToken: string,
    languageInput: string | undefined,
    meta: { ip: string; device: string }
  ): Promise<{
    message: string;
    challengeId: string;
    maskedEmail: string;
    expiresInSeconds: number;
    cooldownSeconds: number;
  }> {
    ensureOtpFeatureEnabled();
    const startTime = Date.now();
    const challengeDbId = verifyAndExtractChallengeId(challengeToken);
    if (!challengeDbId) {
      throw makeHttpError(400, 'Invalid or expired verification session. Please enter your email again.', 'INVALID_CHALLENGE');
    }

    // Handle dummy challenge resend identically to preserve anti-enumeration
    if (challengeDbId.startsWith('otpd-')) {
      const dummy = dummyChallenges.get(challengeDbId);
      if (!dummy) {
        throw makeHttpError(400, 'Verification session expired. Please request a new code.', 'CHALLENGE_EXPIRED');
      }
      await this.enforceRequestLimits(dummy.email, meta.ip);
      recordRequestTimestamp(emailRequestTracker, dummy.email, EMAIL_WINDOW_MS);
      recordRequestTimestamp(ipRequestTracker, meta.ip || '127.0.0.1', IP_WINDOW_MS);
      emailCooldownTracker.set(dummy.email, Date.now());
      dummy.invalidated = true;

      const nextId = `otpd-${crypto.randomBytes(12).toString('hex')}`;
      const expiresInSeconds = config.otp.expiryMinutes * 60;
      dummyChallenges.set(nextId, {
        id: nextId,
        email: dummy.email,
        maskedEmail: dummy.maskedEmail,
        language: languageInput || dummy.language,
        lastSentAt: Date.now(),
        expiresAt: Date.now() + expiresInSeconds * 1000,
        attempts: 0,
        invalidated: false,
      });

      await padResponseTime(startTime);
      return {
        message: GENERIC_OTP_MESSAGE,
        challengeId: signChallengeId(nextId),
        maskedEmail: dummy.maskedEmail,
        expiresInSeconds,
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      };
    }

    const rows = await executeQuery(SQL_FIND_OTP_CHALLENGE_BY_ID, [challengeDbId]);
    const challenge = rows?.[0];
    if (!challenge) {
      throw makeHttpError(400, 'Verification session expired. Please request a new code.', 'CHALLENGE_EXPIRED');
    }

    await this.enforceRequestLimits(challenge.email, meta.ip);
    recordRequestTimestamp(emailRequestTracker, challenge.email, EMAIL_WINDOW_MS);
    recordRequestTimestamp(ipRequestTracker, meta.ip || '127.0.0.1', IP_WINDOW_MS);
    emailCooldownTracker.set(challenge.email, Date.now());

    const userRows = await executeQuery(SQL_FIND_USER_BY_ID, [challenge.admin_id]);
    const adminRow = userRows?.[0];
    const perAdminAllowed =
      adminRow && (adminRow.otp_login_enabled === undefined ? true : Boolean(adminRow.otp_login_enabled));

    if (!adminRow || (adminRow.role !== 'admin' && adminRow.role !== 'superadmin') || !perAdminAllowed || !isDomainAllowed(adminRow.email)) {
      await padResponseTime(startTime);
      const fallbackDummyId = `otpd-${crypto.randomBytes(12).toString('hex')}`;
      return {
        message: GENERIC_OTP_MESSAGE,
        challengeId: signChallengeId(fallbackDummyId),
        maskedEmail: maskEmail(challenge.email),
        expiresInSeconds: config.otp.expiryMinutes * 60,
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      };
    }

    const issued = await this.issueCodeForEligibleAdmin(
      adminRow,
      languageInput || challenge.language || 'en',
      meta
    );

    await padResponseTime(startTime);
    return {
      message: GENERIC_OTP_MESSAGE,
      challengeId: issued.challengeId,
      maskedEmail: maskEmail(adminRow.email),
      expiresInSeconds: issued.expiresInSeconds,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }

  public async verifyOtp(
    challengeToken: string,
    codeInput: string,
    meta: { ip: string; device: string }
  ): Promise<{ user: MySQLUser; token: string }> {
    ensureOtpFeatureEnabled();
    const challengeDbId = verifyAndExtractChallengeId(challengeToken);
    if (!challengeDbId) {
      throw makeHttpError(400, 'Invalid or expired verification session.', 'INVALID_CHALLENGE');
    }

    const cleanCode = String(codeInput || '').replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      throw makeHttpError(400, 'Please enter the 6-digit verification code.', 'INVALID_CODE_FORMAT');
    }

    const ipLock = checkLockout(`ip:${meta.ip || '127.0.0.1'}`);
    if (ipLock.locked) {
      throw makeHttpError(
        429,
        `Too many failed verification attempts. Please try again in ${Math.ceil(ipLock.remainingSeconds / 60)} minute(s).`,
        'OTP_LOCKED',
        { retryAfterSeconds: ipLock.remainingSeconds }
      );
    }

    // Handle dummy challenge verification safely
    if (challengeDbId.startsWith('otpd-')) {
      const dummy = dummyChallenges.get(challengeDbId);
      // Constant-time dummy comparison
      const a = Buffer.from(hashOtpCode(challengeDbId, cleanCode), 'hex');
      const b = Buffer.from(hashOtpCode(challengeDbId, '999999'), 'hex');
      crypto.timingSafeEqual(a, b);

      if (!dummy || dummy.invalidated || Date.now() > dummy.expiresAt || dummy.attempts >= MAX_VERIFY_ATTEMPTS_PER_CODE) {
        throw makeHttpError(401, 'Invalid or expired verification code.', 'OTP_INVALID_OR_EXPIRED');
      }

      dummy.attempts += 1;
      recordVerifyFailure(`email:${dummy.email}`);
      recordVerifyFailure(`ip:${meta.ip || '127.0.0.1'}`);

      if (dummy.attempts >= MAX_VERIFY_ATTEMPTS_PER_CODE) {
        dummy.invalidated = true;
        throw makeHttpError(
          429,
          'Too many incorrect attempts. Please request a new verification code.',
          'OTP_MAX_ATTEMPTS'
        );
      }

      throw makeHttpError(401, 'Invalid or expired verification code.', 'OTP_INVALID');
    }

    const rows = await executeQuery(SQL_FIND_OTP_CHALLENGE_BY_ID, [challengeDbId]);
    const challenge = rows?.[0];
    if (!challenge) {
      throw makeHttpError(401, 'Invalid or expired verification code.', 'OTP_NOT_FOUND');
    }

    const emailLock = checkLockout(`email:${challenge.email}`);
    if (emailLock.locked) {
      throw makeHttpError(
        429,
        `Too many failed verification attempts. Please try again in ${Math.ceil(emailLock.remainingSeconds / 60)} minute(s).`,
        'OTP_LOCKED',
        { retryAfterSeconds: emailLock.remainingSeconds }
      );
    }

    if (challenge.used_at || challenge.invalidated_at) {
      throw makeHttpError(401, 'This verification code is no longer valid. Please request a new one.', 'OTP_INACTIVE');
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await executeQuery(SQL_INVALIDATE_OTP_CHALLENGE, [challengeDbId]);
      throw makeHttpError(401, 'This verification code has expired. Please request a new one.', 'OTP_EXPIRED');
    }

    if (Number(challenge.attempts) >= MAX_VERIFY_ATTEMPTS_PER_CODE) {
      await executeQuery(SQL_INVALIDATE_OTP_CHALLENGE, [challengeDbId]);
      throw makeHttpError(429, 'Too many incorrect attempts. This code has been invalidated.', 'OTP_MAX_ATTEMPTS');
    }

    const submittedHash = hashOtpCode(challengeDbId, cleanCode);
    const submittedBuf = Buffer.from(submittedHash, 'hex');
    const storedBuf = Buffer.from(String(challenge.code_hash || ''), 'hex');
    const isMatch =
      submittedBuf.length === storedBuf.length && crypto.timingSafeEqual(submittedBuf, storedBuf);

    if (!isMatch) {
      const prevAttempts = Number(challenge.attempts || 0);
      await executeQuery(SQL_INCREMENT_OTP_ATTEMPTS, [challengeDbId]);
      const newAttempts = prevAttempts + 1;

      recordVerifyFailure(`email:${challenge.email}`);
      recordVerifyFailure(`ip:${meta.ip || '127.0.0.1'}`);

      await authService.logSecurityEvent({
        userId: challenge.admin_id,
        action: 'otp_failed',
        ip: meta.ip,
        location: 'Manama, Bahrain',
        device: meta.device,
      });

      if (newAttempts >= MAX_VERIFY_ATTEMPTS_PER_CODE) {
        await executeQuery(SQL_INVALIDATE_OTP_CHALLENGE, [challengeDbId]);
        await authService.logSecurityEvent({
          userId: challenge.admin_id,
          action: 'otp_locked',
          ip: meta.ip,
          location: 'Manama, Bahrain',
          device: meta.device,
        });
        throw makeHttpError(
          429,
          'Maximum incorrect attempts reached. For your security, this code has been invalidated.',
          'OTP_MAX_ATTEMPTS'
        );
      }

      throw makeHttpError(401, 'Invalid or expired verification code.', 'OTP_INVALID');
    }

    // Re-check admin status & permissions at verify time
    const userRows = await executeQuery(SQL_FIND_USER_BY_EMAIL, [challenge.email]);
    const rawAdmin = userRows?.[0];
    const perAdminAllowed =
      rawAdmin && (rawAdmin.otp_login_enabled === undefined ? true : Boolean(rawAdmin.otp_login_enabled));

    if (!rawAdmin || (rawAdmin.role !== 'admin' && rawAdmin.role !== 'superadmin') || rawAdmin.is_guest || !perAdminAllowed || !isDomainAllowed(rawAdmin.email)) {
      await executeQuery(SQL_INVALIDATE_OTP_CHALLENGE, [challengeDbId]);
      throw makeHttpError(403, 'Email code sign-in is not permitted for this account.', 'OTP_NOT_PERMITTED');
    }

    // Atomically mark OTP challenge as used (single-use) and invalidate any siblings
    const markRes: any = await executeQuery(SQL_MARK_OTP_USED, [challengeDbId]);
    const affectedRows = Number(markRes?.affectedRows ?? markRes?.[0]?.affectedRows ?? 1);
    if (affectedRows === 0) {
      throw makeHttpError(401, 'This verification code has already been used.', 'OTP_ALREADY_USED');
    }
    await executeQuery(SQL_INVALIDATE_ADMIN_ACTIVE_OTPS, [rawAdmin.id]);

    clearVerifyFailures(`email:${challenge.email}`);
    clearVerifyFailures(`ip:${meta.ip || '127.0.0.1'}`);

    await authService.logSecurityEvent({
      userId: rawAdmin.id,
      action: 'otp_verified',
      ip: meta.ip,
      location: 'Manama, Bahrain',
      device: meta.device,
    });
    await authService.logSecurityEvent({
      userId: rawAdmin.id,
      action: 'otp_login_success',
      ip: meta.ip,
      location: 'Manama, Bahrain',
      device: meta.device,
    });

    const user = (await authService.findUserById(rawAdmin.id))!;
    const token = signAdminToken({
      id: user.id,
      email: user.email,
      role: user.role === 'superadmin' ? 'superadmin' : 'admin',
      mustChangePassword: Boolean(user.mustChangePassword),
      authMethod: 'otp',
    });

    // Fire security notification email asynchronously (do not fail a verified login if alert email has a transient error)
    void sendAdminOtpLoginAlertEmail({
      to: user.email,
      language: challenge.language || 'en',
      loginIp: meta.ip,
      device: meta.device,
      loginAt: new Date(),
    });

    return { user, token };
  }
}

export const adminOtpService = new AdminOtpService();
