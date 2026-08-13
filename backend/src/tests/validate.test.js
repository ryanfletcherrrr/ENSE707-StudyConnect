import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isNonEmptyString, isValidPassword } from '../utils/validate.js';

test('isValidEmail accepts well-formed addresses', () => {
  assert.equal(isValidEmail('ava.ngata@aut.ac.nz'), true);
});

test('isValidEmail rejects malformed addresses', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(undefined), false);
});

test('isNonEmptyString rejects blank/whitespace-only strings', () => {
  assert.equal(isNonEmptyString('   '), false);
  assert.equal(isNonEmptyString(''), false);
  assert.equal(isNonEmptyString('Ava'), true);
});

test('isNonEmptyString enforces a max length', () => {
  assert.equal(isNonEmptyString('a'.repeat(10), { max: 5 }), false);
  assert.equal(isNonEmptyString('a'.repeat(5), { max: 5 }), true);
});

test('isValidPassword requires at least 8 characters', () => {
  assert.equal(isValidPassword('short'), false);
  assert.equal(isValidPassword('longenough1'), true);
});
