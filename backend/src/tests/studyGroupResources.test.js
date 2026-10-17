// Tests the Share Learning Resources feature.
// Group members can share and view resources, while invalid or
// unauthorized requests are rejected.

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

async function registerStudent(label = 'Resource') {
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: label,
      last_name: 'Student',
      email: `${label.toLowerCase()}.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`,
      password: 'Password123!',
      course: 'ENSE707',
    }),
  });

  const data = await res.json();
  return { token: data.token, studentId: data.student.id };
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function createGroup(token) {
  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Resource Test Group',
      course: 'ENSE707',
      description: 'A group for testing shared learning resources.',
      capacity: 4,
    }),
  });

  assert.equal(res.status, 201);
  return (await res.json()).group;
}

test('resources: a group member can share a learning resource', async () => {
    const student = await registerStudent('Sharer');
    const group = await createGroup(student.token);
  
    const res = await fetch(
      `${server.baseUrl}/study-groups/${group.id}/resources`,
      {
        method: 'POST',
        headers: authHeaders(student.token),
        body: JSON.stringify({
          title: 'ENSE707 Study Guide',
          url: 'https://example.com/ense707-guide',
          description: 'Useful study material for ENSE707.',
        }),
      }
    );
  
    const data = await res.json();
  
    assert.equal(res.status, 201);
    assert.equal(data.resource.title, 'ENSE707 Study Guide');
    assert.equal(data.resource.studyGroupId, group.id);
  });
  
  test('resources: a group member can view shared learning resources', async () => {
    const student = await registerStudent('Viewer');
    const group = await createGroup(student.token);
  
    await fetch(`${server.baseUrl}/study-groups/${group.id}/resources`, {
      method: 'POST',
      headers: authHeaders(student.token),
      body: JSON.stringify({
        title: 'Testing Notes',
        url: 'https://example.com/testing-notes',
        description: 'Notes for our study group.',
      }),
    });
  
    const res = await fetch(
      `${server.baseUrl}/study-groups/${group.id}/resources`,
      {
        headers: authHeaders(student.token),
      }
    );
  
    const data = await res.json();
  
    assert.equal(res.status, 200);
    assert.equal(data.resources.length, 1);
    assert.equal(data.resources[0].title, 'Testing Notes');
  });
  
  test('resources: an invalid URL is rejected with 400', async () => {
    const student = await registerStudent('InvalidUrl');
    const group = await createGroup(student.token);
  
    const res = await fetch(
      `${server.baseUrl}/study-groups/${group.id}/resources`,
      {
        method: 'POST',
        headers: authHeaders(student.token),
        body: JSON.stringify({
          title: 'Bad Resource',
          url: 'not-a-valid-url',
        }),
      }
    );
  
    assert.equal(res.status, 400);
  });
  
  test('resources: a non-member cannot share resources', async () => {
    const owner = await registerStudent('Owner');
    const outsider = await registerStudent('Outsider');
    const group = await createGroup(owner.token);
  
    const res = await fetch(
      `${server.baseUrl}/study-groups/${group.id}/resources`,
      {
        method: 'POST',
        headers: authHeaders(outsider.token),
        body: JSON.stringify({
          title: 'Unauthorized Resource',
          url: 'https://example.com/resource',
        }),
      }
    );
  
    assert.equal(res.status, 403);
  });
  
  test('resources: an unauthenticated request is rejected with 401', async () => {
    const student = await registerStudent('OwnerTwo');
    const group = await createGroup(student.token);
  
    const res = await fetch(
      `${server.baseUrl}/study-groups/${group.id}/resources`,
      {
        method: 'GET',
      }
    );
  
    assert.equal(res.status, 401);
  });