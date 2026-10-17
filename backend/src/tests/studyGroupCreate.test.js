// Covers the new "create a study group" feature: a student can create a
// group (which starts with one slot and auto-enrols them as its first
// member), with validation on all fields.
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
    first_name: 'Group',
    last_name: 'Creator',
    email: `creator.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`,
    password: 'Password123!',
    course: 'ENSE707',
  };

  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { token: data.token, studentId: data.student.id };
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

test('create group: a valid request creates a group with one slot and enrols the creator', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'ENSE707 Thursday Study Group',
      course: 'ense707',
      description: 'Weekly Thursday study session for ENSE707.',
      capacity: 4,
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.group.groupName, 'ENSE707 Thursday Study Group');
  assert.equal(data.group.course, 'ENSE707', 'course should be normalised to uppercase, like search');
  assert.equal(data.group.groupNumber, 1);
  assert.equal(data.group.capacity, 4);
  assert.equal(data.group.memberCount, 1, 'the creator should be auto-enrolled');
});

test('create group: the creator can immediately see themselves as a member via the slots endpoint', async () => {
  const { token } = await registerStudent();

  const createRes = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Verify Membership Group',
      course: 'ENSE707',
      description: 'Checking auto-enrolment.',
    }),
  });
  const created = await createRes.json();

  const slotsRes = await fetch(`${server.baseUrl}/study-groups/${created.group.id}/slots`, {
    headers: authHeaders(token),
  });
  const slotsData = await slotsRes.json();

  assert.equal(slotsRes.status, 200);
  assert.equal(slotsData.slots.length, 1);
  assert.equal(slotsData.slots[0].member_count, 1);
});

test('create group: omitting capacity defaults to 6 (matches seeded groups)', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Default Capacity Group',
      course: 'ENSE707',
      description: 'No capacity specified.',
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.group.capacity, 6);
});

test('create group: a newly created group is findable via course search', async () => {
  const { token } = await registerStudent();
  const uniqueCourse = `TST${Date.now()}`.slice(0, 20);

  await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Findable Group',
      course: uniqueCourse,
      description: 'Should show up in search.',
    }),
  });

  const res = await fetch(`${server.baseUrl}/study-groups?course=${uniqueCourse}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.groups.length, 1);
  assert.equal(data.groups[0].group_name, 'Findable Group');
});

test('create group: missing group_name is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ course: 'ENSE707', description: 'No name given.' }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.ok(data.details.some((d) => d.includes('group_name')));
});

test('create group: missing course is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ group_name: 'No Course Group', description: 'No course given.' }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.ok(data.details.some((d) => d.includes('course')));
});

test('create group: missing description is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ group_name: 'No Description Group', course: 'ENSE707' }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.ok(data.details.some((d) => d.includes('description')));
});

test('create group: capacity of 0 is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Zero Capacity Group',
      course: 'ENSE707',
      description: 'Should be rejected.',
      capacity: 0,
    }),
  });

  assert.equal(res.status, 400);
});

test('create group: capacity of 1 is rejected (a "group" of one member alone doesn\'t make sense)', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Solo Group',
      course: 'ENSE707',
      description: 'Should be rejected.',
      capacity: 1,
    }),
  });

  assert.equal(res.status, 400);
});

test('create group: capacity above the maximum (20) is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Huge Group',
      course: 'ENSE707',
      description: 'Should be rejected.',
      capacity: 21,
    }),
  });

  assert.equal(res.status, 400);
});

test('create group: a non-integer capacity is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Fractional Group',
      course: 'ENSE707',
      description: 'Should be rejected.',
      capacity: 4.5,
    }),
  });

  assert.equal(res.status, 400);
});

test('create group: an oversized group_name is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'x'.repeat(151),
      course: 'ENSE707',
      description: 'Name is too long.',
    }),
  });

  assert.equal(res.status, 400);
});

test('create group: unauthenticated request is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_name: 'No Auth Group',
      course: 'ENSE707',
      description: 'Should be rejected.',
    }),
  });

  assert.equal(res.status, 401);
});
