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

async function registerStudent() {
  const body = {
    first_name: 'Test',
    last_name: 'Student',
    email: `validation.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`,
    password: 'Password123!',
    course: 'ENSE707',
  };

  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data.token;
}

test('course search trims spaces and accepts lowercase course input', async () => {
  const token = await registerStudent();

  const res = await fetch(
    `${server.baseUrl}/study-groups?course=%20%20ense707%20%20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  assert.equal(res.status, 200);
});

test('course search rejects a course longer than 20 characters', async () => {
  const token = await registerStudent();

  const longCourse = 'A'.repeat(21);

  const res = await fetch(
    `${server.baseUrl}/study-groups?course=${longCourse}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.error, 'Course must be 20 characters or fewer.');
});