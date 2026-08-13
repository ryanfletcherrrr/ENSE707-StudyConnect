import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidPassword,
  validateLoginForm,
  validateRegisterForm,
  validateProfileForm,
} from '../public/js/validate.js';

test('isValidEmail / isValidPassword basics', () => {
  assert.equal(isValidEmail('ava@aut.ac.nz'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidPassword('short'), false);
  assert.equal(isValidPassword('longenough1'), true);
});

test('validateLoginForm: valid input produces no errors', () => {
  const errors = validateLoginForm({ email: 'ava@aut.ac.nz', password: 'somepassword' });
  assert.deepEqual(errors, {});
});

test('validateLoginForm: flags a bad email and an empty password (AC-02 support)', () => {
  const errors = validateLoginForm({ email: 'not-an-email', password: '' });
  assert.ok(errors.email);
  assert.ok(errors.password);
});

test('validateRegisterForm: valid input produces no errors', () => {
  const errors = validateRegisterForm({
    first_name: 'Ava',
    last_name: 'Ngata',
    email: 'ava@aut.ac.nz',
    password: 'Password123!',
  });
  assert.deepEqual(errors, {});
});

test('validateRegisterForm: flags missing names and a short password', () => {
  const errors = validateRegisterForm({
    first_name: '  ',
    last_name: '',
    email: 'ava@aut.ac.nz',
    password: 'short',
  });
  assert.ok(errors.first_name);
  assert.ok(errors.last_name);
  assert.ok(errors.password);
  assert.equal(errors.email, undefined);
});

test('validateProfileForm (AC-05): valid edits produce no errors', () => {
  const errors = validateProfileForm({
    first_name: 'Ava',
    last_name: 'Ngata',
    course: 'ENSE707',
    bio: 'Hello!',
  });
  assert.deepEqual(errors, {});
});

test('validateProfileForm (AC-05): rejects an empty first name', () => {
  const errors = validateProfileForm({ first_name: '   ', last_name: 'Ngata', course: '', bio: '' });
  assert.ok(errors.first_name);
});

test('validateProfileForm: rejects an overly long bio', () => {
  const errors = validateProfileForm({
    first_name: 'Ava',
    last_name: 'Ngata',
    course: '',
    bio: 'x'.repeat(2001),
  });
  assert.ok(errors.bio);
});
