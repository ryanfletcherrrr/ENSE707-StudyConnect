// Covers FR-01 (login) and acceptance criteria AC-01, AC-02, AC-03 from the
// StudyConnect requirements doc, plus registration (Workflow 4) which login
// depends on for there to be an account to test against.
import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';

let server;

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server.close();
});

async function registerStudent(overrides = {}) {
  const body = {
    first_name: 'Ava',
    last_name: 'Ngata',
    email: `ava.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`,
    password: 'Password123!',
    course: 'ENSE707',
    ...overrides,
  };
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data, credentials: body };
}

test('register: creates a new student and returns a session token', async () => {
  const { res, data } = await registerStudent();
  assert.equal(res.status, 201);
  assert.equal(typeof data.token, 'string');
  assert.equal(data.student.first_name, 'Ava');
  assert.equal(data.student.password_hash, undefined, 'password hash must never be returned');
});

test('register: rejects a duplicate email', async () => {
  const { credentials } = await registerStudent();
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...credentials, email: credentials.email }),
  });
  assert.equal(res.status, 409);
});

test('register: rejects an invalid registration (short password)', async () => {
  const { res } = await registerStudent({ password: 'short' });
  assert.equal(res.status, 400);
});

// AC-01: valid credentials authenticate the user and grant access.
test('login (AC-01): valid credentials return a token and the student profile', async () => {
  const { credentials } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(typeof data.token, 'string');
  assert.equal(data.student.email, credentials.email);
});

// AC-02: invalid credentials are rejected with a clear error message.
test('login (AC-02): wrong password is rejected with 401 and an error message', async () => {
  const { credentials } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.email, password: 'WrongPassword1' }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(typeof data.error, 'string');
  assert.ok(data.error.length > 0);
});

test('login (AC-02): unknown email is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@aut.ac.nz', password: 'WhoKnows1' }),
  });
  assert.equal(res.status, 401);
});

test('login: rejects a malformed request body', async () => {
  const res = await fetch(`${server.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  assert.equal(res.status, 400);
});

// AC-03: a user who has not authenticated cannot access authenticated-only
// functions (exercised here via the login-adjacent /profile/me route).
test('AC-03: an unauthenticated request to a protected route is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/profile/me`);
  assert.equal(res.status, 401);
});
