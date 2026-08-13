import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../utils/token.js';

test('signToken produces a token that verifyToken can decode back to the same payload', () => {
  const token = signToken({ sub: 42, email: 'ava@aut.ac.nz' }, 'secret');
  const payload = verifyToken(token, 'secret');
  assert.equal(payload.sub, 42);
  assert.equal(payload.email, 'ava@aut.ac.nz');
});

test('verifyToken rejects a token signed with a different secret', () => {
  const token = signToken({ sub: 1 }, 'secret-a');
  assert.throws(() => verifyToken(token, 'secret-b'));
});

test('verifyToken rejects an expired token', () => {
  const token = signToken({ sub: 1 }, 'secret', { expiresIn: -10 });
  assert.throws(() => verifyToken(token, 'secret'), /expired/);
});

test('verifyToken rejects a malformed token', () => {
  assert.throws(() => verifyToken('not-a-jwt', 'secret'));
});
