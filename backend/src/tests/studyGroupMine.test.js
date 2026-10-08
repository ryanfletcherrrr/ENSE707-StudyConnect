// Covers the "my groups" feature: GET /api/study-groups/mine lists the study
// groups the signed-in student belongs to, including groups they created,
// groups they joined, and reflecting leaves/moves.
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

async function registerStudent(label = 'Mine') {
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
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function createGroup(token, overrides = {}) {
  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Mine Test Group',
      course: 'ENSE707',
      description: 'A group for testing the my-groups endpoint.',
      capacity: 3,
      ...overrides,
    }),
  });
  const data = await res.json();
  assert.equal(res.status, 201);
  return data.group;
}

async function getMine(token) {
  const res = await fetch(`${server.baseUrl}/study-groups/mine`, {
    headers: authHeaders(token),
  });
  return { res, data: await res.json() };
}

test('my groups: a new student with no groups gets an empty list', async () => {
  const { token } = await registerStudent('Empty');
  const { res, data } = await getMine(token);

  assert.equal(res.status, 200);
  assert.deepEqual(data.groups, []);
});

test('my groups: a group the student created appears with slot and member details', async () => {
  const { token } = await registerStudent('Creator');
  const group = await createGroup(token, { group_name: 'Creator Group', capacity: 4 });

  const { res, data } = await getMine(token);

  assert.equal(res.status, 200);
  assert.equal(data.groups.length, 1);
  const mine = data.groups[0];
  assert.equal(mine.id, group.id);
  assert.equal(mine.group_name, 'Creator Group');
  assert.equal(mine.course, 'ENSE707');
  assert.equal(mine.slot_id, group.slotId);
  assert.equal(mine.group_number, 1);
  assert.equal(mine.capacity, 4);
  assert.equal(mine.member_count, 1);
});

test('my groups: joining a group adds it, and member_count reflects everyone in the slot', async () => {
  const creator = await registerStudent('Host');
  const joiner = await registerStudent('Joiner');
  const group = await createGroup(creator.token);

  const joinRes = await fetch(`${server.baseUrl}/study-groups/join`, {
    method: 'POST',
    headers: authHeaders(joiner.token),
    body: JSON.stringify({ slotId: group.slotId }),
  });
  assert.equal(joinRes.status, 200);

  const { data } = await getMine(joiner.token);
  assert.equal(data.groups.length, 1);
  assert.equal(data.groups[0].id, group.id);
  assert.equal(data.groups[0].member_count, 2);
});

test('my groups: only the signed-in student\'s own groups are returned', async () => {
  const a = await registerStudent('Alice');
  const b = await registerStudent('Bob');
  const groupA = await createGroup(a.token, { group_name: 'Alice Only' });
  await createGroup(b.token, { group_name: 'Bob Only' });

  const { data } = await getMine(a.token);
  assert.equal(data.groups.length, 1);
  assert.equal(data.groups[0].id, groupA.id);
  assert.equal(data.groups[0].group_name, 'Alice Only');
});

test('my groups: leaving a group removes it from the list', async () => {
  const creator = await registerStudent('Leaver');
  const group = await createGroup(creator.token);

  const leaveRes = await fetch(`${server.baseUrl}/study-groups/leave`, {
    method: 'DELETE',
    headers: authHeaders(creator.token),
    body: JSON.stringify({ slotId: group.slotId }),
  });
  assert.equal(leaveRes.status, 200);

  const { data } = await getMine(creator.token);
  assert.deepEqual(data.groups, []);
});

test('my groups: a student in several groups gets all of them', async () => {
  const { token } = await registerStudent('Many');
  const g1 = await createGroup(token, { group_name: 'First Group' });
  const g2 = await createGroup(token, { group_name: 'Second Group', course: 'COMP500' });

  const { data } = await getMine(token);
  const ids = data.groups.map((g) => g.id).sort();
  assert.deepEqual(ids, [g1.id, g2.id].sort());
});

test('my groups: unauthenticated request is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/study-groups/mine`);
  assert.equal(res.status, 401);
});
