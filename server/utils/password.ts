import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const BCRYPT_COST = 12;

const SCRYPT_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hash a plaintext password using bcrypt with cost factor 12.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

/**
 * Check whether a stored password_hash is in bcrypt format ($2a$, $2b$, or $2y$).
 */
export function isBcryptHash(storedHash?: string | null): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  return (
    (storedHash.startsWith('$2a$') ||
      storedHash.startsWith('$2b$') ||
      storedHash.startsWith('$2y$')) &&
    storedHash.length >= 59
  );
}

/**
 * Check whether a stored password_hash is in the legacy scrypt format:
 * scrypt$<salt_hex>$<hash_hex>
 */
export function isScryptHash(storedHash?: string | null): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  return (
    parts.length === 3 &&
    parts[0] === SCRYPT_PREFIX &&
    parts[1].length >= 16 &&
    parts[2].length === KEY_LENGTH * 2
  );
}

/**
 * Check whether a stored password_hash value uses any supported hash format (bcrypt or scrypt).
 */
export function isHashedPassword(storedHash?: string | null): boolean {
  return isBcryptHash(storedHash) || isScryptHash(storedHash);
}

/**
 * Returns true if the stored hash should be transparently upgraded to bcrypt on next successful login.
 */
export function needsPasswordMigration(storedHash?: string | null): boolean {
  if (!storedHash) return false;
  return !isBcryptHash(storedHash);
}

/**
 * Dual-format password verification:
 * - If storedHash starts with "scrypt$", verify using the original scrypt(salt, keylen=64) logic.
 * - If storedHash starts with "$2a$", "$2b$", or "$2y$", verify using bcrypt.compare.
 * - Otherwise, perform constant-time legacy plaintext check so unhashed legacy entries can migrate.
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash?: string | null
): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;

  if (isScryptHash(storedHash)) {
    const [, salt, hashHex] = storedHash.split('$');
    const derived = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  if (isBcryptHash(storedHash)) {
    // Normalize $2y$ (PHP/OpenBSD variant) to $2b$ for bcryptjs compatibility
    const normalized = storedHash.startsWith('$2y$')
      ? `$2b$${storedHash.slice(4)}`
      : storedHash;
    return bcrypt.compare(plainPassword, normalized);
  }

  // Legacy unhashed entry comparison (constant-time when equal length) so existing rows can log in and re-hash
  const a = Buffer.from(plainPassword, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
