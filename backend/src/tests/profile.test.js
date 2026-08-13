// Covers FR-02 (profile management) and acceptance criteria AC-04, AC-05,
// AC-06 from the StudyConnect requirements doc.
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
  const email = `student.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`;
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Liam',
      last_name: 'Chen',
      email,
      password: 'Password123!',
      course: 'ENSE707',
      bio: 'Original bio.',
    }),
  });
  const data = await res.json();
  return { token: data.token, email };
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// AC-04: an authenticated user can view their own profile.
test('AC-04: an authenticated user can fetch their own profile', async () => {
  const { token, email } = await registerAndLogin();

  const res = await fetch(`${server.baseUrl}/profile/me`, { headers: authHeaders(token) });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.student.email, email);
  assert.equal(data.student.password_hash, undefined);
});

// AC-05: an authenticated user can modify supported editable profile fields.
test('AC-05: an authenticated user can update their profile fields', async () => {
  const { token } = await registerAndLogin();

  const res = await fetch(`${server.baseUrl}/profile/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ first_name: 'Liam-Updated', bio: 'Updated bio text.' }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.student.first_name, 'Liam-Updated');
  assert.equal(data.student.bio, 'Updated bio text.');
});

// AC-06: valid profile changes are saved and displayed after the update.
test('AC-06: an updated profile is reflected on a subsequent fetch', async () => {
  const { token } = await registerAndLogin();

  await fetch(`${server.baseUrl}/profile/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ course: 'ENSE701' }),
  });

  const res = await fetch(`${server.baseUrl}/profile/me`, { headers: authHeaders(token) });
  const data = await res.json();

  assert.equal(data.student.course, 'ENSE701');
});

test('profile update rejects an empty first_name with a clear error', async () => {
  const { token } = await registerAndLogin();

  const res = await fetch(`${server.baseUrl}/profile/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ first_name: '   ' }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.ok(data.error);
});

test('profile update ignores unsupported fields (e.g. cannot change email via this endpoint)', async () => {
  const { token, email } = await registerAndLogin();

  const res = await fetch(`${server.baseUrl}/profile/me`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ email: 'someone-else@aut.ac.nz' }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.student.email, email, 'email must be unchanged - not an editable field');
});

test('a request with an invalid/garbage token is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/profile/me`, {
    headers: authHeaders('this-is-not-a-valid-token'),
  });
  assert.equal(res.status, 401);
});
