// Regression tests for DEF-01, DEF-02, DEF-03 from the QA pass
// (StudyConnect_Defect_Log.xlsx). These were originally fixed and committed
// in an earlier session whose commits never reached GitHub (git push was
// blocked for that session), so the fixes are being redone here against the
// current codebase - see the project build log for the original findings.
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

async function registerAndLogin() {
  const email = `limits.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`;
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Student',
      email,
      password: 'Password123!',
      course: 'ENSE707',
    }),
  });
  const data = await res.json();
  return { token: data.token, email };
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// DEF-01: an oversized request body used to call req.destroy(), which reset
// the TCP connection instead of returning a clean error. The regression
// test is that fetch() gets back an actual HTTP response (413), not a
// network-level failure.
test('DEF-01: an oversized request body gets a clean 413 response, not a connection reset', async () => {
  const oversizedBio = 'x'.repeat(1_500_000); // over the 1MB MAX_BODY_BYTES limit

  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Student',
      email: `oversized.${Date.now()}@aut.ac.nz`,
      password: 'Password123!',
      bio: oversizedBio,
    }),
  });

  assert.equal(res.status, 413);
  const data = await res.json();
  assert.ok(data.error);
});

// DEF-02: bio had no length limit at all - a direct API call (bypassing the
// UI's maxlength) could save an unbounded bio.
test('DEF-02: profile update rejects a bio over 2000 characters', async () => {
  const { token } = await registerAndLogin();

  const res = await fetch(`${server.baseUrl}/profile/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ bio: 'x'.repeat(2001) }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error);
});

test('DEF-02: profile update accepts a bio at exactly the 2000-character limit', async () => {
  const { token } = await registerAndLogin();

  const res = await fetch(`${server.baseUrl}/profile/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ bio: 'x'.repeat(2000) }),
  });

  assert.equal(res.status, 200);
});

test('DEF-02: registration also rejects an unbounded bio (same endpoint class of bug)', async () => {
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Student',
      email: `bio-reg.${Date.now()}@aut.ac.nz`,
      password: 'Password123!',
      bio: 'x'.repeat(2001),
    }),
  });

  assert.equal(res.status, 400);
});

// DEF-03: password had a minimum length but no maximum, so an oversized
// password was hashed as-is (unbounded scrypt input).
test('DEF-03: registration rejects a password over 128 characters', async () => {
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Student',
      email: `pw-long.${Date.now()}@aut.ac.nz`,
      password: 'x'.repeat(129),
    }),
  });

  assert.equal(res.status, 400);
});

test('DEF-03: registration accepts a password at exactly the 128-character limit', async () => {
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Student',
      email: `pw-max.${Date.now()}@aut.ac.nz`,
      password: 'x'.repeat(128),
    }),
  });

  assert.equal(res.status, 201);
});
