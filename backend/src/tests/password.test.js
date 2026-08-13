import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../utils/password.js';

test('hashPassword produces a hash that verifyPassword accepts for the correct password', () => {
  const hash = hashPassword('CorrectHorseBattery1');
  assert.equal(verifyPassword('CorrectHorseBattery1', hash), true);
});

test('verifyPassword rejects an incorrect password', () => {
  const hash = hashPassword('CorrectHorseBattery1');
  assert.equal(verifyPassword('WrongPassword', hash), false);
});

test('hashPassword salts each hash differently', () => {
  const hashA = hashPassword('SamePassword1');
  const hashB = hashPassword('SamePassword1');
  assert.notEqual(hashA, hashB);
});

test('verifyPassword rejects malformed stored hashes instead of throwing', () => {
  assert.equal(verifyPassword('anything', 'not-a-real-hash'), false);
  assert.equal(verifyPassword('anything', undefined), false);
});
