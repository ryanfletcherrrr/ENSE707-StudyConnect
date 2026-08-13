// A minimal HS256 JSON Web Token implementation using Node's built-in
// crypto module, replacing the "jsonwebtoken" package so the project needs
// zero external dependencies. Produces and verifies standard
// header.payload.signature JWTs - the output is interoperable with any
// standard JWT library if this project later swaps in the real
// "jsonwebtoken" package.
import { createHmac, timingSafeEqual } from 'node:crypto';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(headerAndPayload, secret) {
  return createHmac('sha256', secret).update(headerAndPayload).digest('base64url');
}

function parseExpiry(expiresIn) {
  // Supports simple formats like "1h", "30m", "3600" (seconds).
  if (typeof expiresIn === 'number') return expiresIn;

  const match = /^(\d+)([smhd])?$/.exec(String(expiresIn).trim());
  if (!match) return 3600; // default 1 hour

  const value = Number(match[1]);
  const unit = match[2] || 's';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}

export function signToken(payload, secret, { expiresIn = '1h' } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + parseExpiry(expiresIn),
  };

  const headerAndPayload = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(fullPayload))}`;
  const signature = sign(headerAndPayload, secret);
  return `${headerAndPayload}.${signature}`;
}

export function verifyToken(token, secret) {
  if (typeof token !== 'string') throw new Error('Token must be a string.');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token.');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  const providedSigBuf = Buffer.from(encodedSignature);
  const expectedSigBuf = Buffer.from(expectedSignature);
  const signaturesMatch =
    providedSigBuf.length === expectedSigBuf.length &&
    timingSafeEqual(providedSigBuf, expectedSigBuf);

  if (!signaturesMatch) throw new Error('Invalid token signature.');

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && nowSeconds >= payload.exp) {
    throw new Error('Token has expired.');
  }

  return payload;
}
