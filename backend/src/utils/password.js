// Password hashing using Node's built-in crypto module (scrypt), replacing
// the "bcrypt"/"bcryptjs" packages so the project needs zero external
// dependencies. scrypt is a well-regarded, memory-hard password hashing
// algorithm and is what Node's own documentation recommends for this
// purpose: https://nodejs.org/api/crypto.html#using-strong-password-hashing
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

// Produces a self-describing string: scrypt:<saltHex>:<hashHex>
// so verification doesn't need to know the salt separately.
export function hashPassword(plainTextPassword) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(plainTextPassword, salt, KEY_LENGTH);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(plainTextPassword, storedHash) {
  if (typeof storedHash !== 'string') return false;

  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const [, salt, hashHex] = parts;
  const derivedKey = scryptSync(plainTextPassword, salt, KEY_LENGTH);
  const storedKey = Buffer.from(hashHex, 'hex');

  if (derivedKey.length !== storedKey.length) return false;

  // Constant-time comparison to avoid leaking timing information about
  // how much of the hash matched.
  return timingSafeEqual(derivedKey, storedKey);
}
