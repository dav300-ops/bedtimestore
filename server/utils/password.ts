import crypto from 'crypto';

const SCRYPT_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Hash a plaintext password with a random 16-byte salt using Node's native scrypt.
 * Stored format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, KEY_LENGTH).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${derivedKey}`;
}

/**
 * Check whether a stored password_hash value is already scrypt-hashed.
 */
export function isHashedPassword(storedHash?: string | null): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  return parts.length === 3 && parts[0] === SCRYPT_PREFIX && parts[1].length >= 16 && parts[2].length === KEY_LENGTH * 2;
}

/**
 * Verify a plaintext password against a stored scrypt hash (or legacy plaintext entry for transparent migration).
 */
export function verifyPassword(plainPassword: string, storedHash?: string | null): boolean {
  if (!plainPassword || !storedHash) return false;

  if (isHashedPassword(storedHash)) {
    const [, salt, hashHex] = storedHash.split('$');
    const derived = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  // Legacy unhashed entry comparison (constant-time when equal length) so existing rows can log in and re-hash
  const a = Buffer.from(plainPassword, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
