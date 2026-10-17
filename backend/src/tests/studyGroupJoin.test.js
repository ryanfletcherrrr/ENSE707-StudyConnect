// Covers FR-06 (join a study group) and acceptance criteria AC-10, AC-11 and
// AC-12, plus the leave-group behaviour that goes with it: membership is
// recorded, a student cannot join the same slot twice, full groups reject
// new members, and moving between slots of one group leaves the old slot.
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

async function registerStudent(label = 'Join') {
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

// Groups are created through the real API (which also enrols the creator).
async function createGroup(token, capacity = 4) {
  const res = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Join Test Group',
      course: 'ENSE707',
      description: 'A group for testing joining and leaving.',
      capacity,
    }),
  });
  assert.equal(res.status, 201);
  return (await res.json()).group;
}

function join(token, slotId) {
  return fetch(`${server.baseUrl}/study-groups/join`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ slotId }),
  });
}

function leave(token, slotId) {
  return fetch(`${server.baseUrl}/study-groups/leave`, {
    method: 'DELETE',
    headers: authHeaders(token),
    body: JSON.stringify({ slotId }),
  });
}

async function memberCount(token, group, slotId) {
  const res = await fetch(`${server.baseUrl}/study-groups/${group.id}/slots`, {
    headers: authHeaders(token),
  });
  const { slots } = await res.json();
  return slots.find((slot) => slot.id === slotId).member_count;
}

test('join (AC-10): an authenticated student can join an available study group', async () => {
  const host = await registerStudent('Host');
  const joiner = await registerStudent('Joiner');
  const group = await createGroup(host.token);

  const res = await join(joiner.token, group.slotId);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.group.slotId, group.slotId);
  assert.equal(data.group.memberCount, 2);
  assert.match(data.message, /joined/i);
});

test('join (AC-11): after joining, the membership is recorded in the group information', async () => {
  const host = await registerStudent('Host');
  const joiner = await registerStudent('Joiner');
  const group = await createGroup(host.token);

  assert.equal(await memberCount(joiner.token, group, group.slotId), 1);
  await join(joiner.token, group.slotId);
  assert.equal(await memberCount(joiner.token, group, group.slotId), 2);
});

test('join (AC-12): a student cannot join the same group twice', async () => {
  const host = await registerStudent('Host');
  const joiner = await registerStudent('Joiner');
  const group = await createGroup(host.token);

  assert.equal((await join(joiner.token, group.slotId)).status, 200);

  const second = await join(joiner.token, group.slotId);
  const data = await second.json();
  assert.equal(second.status, 409);
  assert.match(data.error, /already joined/i);
  assert.equal(await memberCount(joiner.token, group, group.slotId), 2, 'no duplicate member row');
});

test('join (AC-12): the creator, who is auto-enrolled, cannot join their own group again', async () => {
  const host = await registerStudent('Host');
  const group = await createGroup(host.token);

  const res = await join(host.token, group.slotId);
  assert.equal(res.status, 409);
  assert.equal(await memberCount(host.token, group, group.slotId), 1);
});

test('join: a group at capacity rejects new members with 409', async () => {
  const host = await registerStudent('Host');
  const first = await registerStudent('First');
  const late = await registerStudent('Late');
  const group = await createGroup(host.token, 2);

  assert.equal((await join(first.token, group.slotId)).status, 200); // 2 of 2

  const res = await join(late.token, group.slotId);
  const data = await res.json();
  assert.equal(res.status, 409);
  assert.match(data.error, /full/i);
  assert.equal(await memberCount(late.token, group, group.slotId), 2);
});

test('join: joining another slot of the same group moves the student out of their old slot', async () => {
  const host = await registerStudent('Host');
  const joiner = await registerStudent('Mover');
  const group = await createGroup(host.token);

  // The create-group API makes one slot; add a second directly, as the
  // seed script does for the seeded groups.
  const { default: db } = await import('../db/index.js');
  const secondSlot = db
    .prepare('INSERT INTO study_group_slots (study_group_id, group_number, capacity) VALUES (?, 2, 4)')
    .run(group.id).lastInsertRowid;
  const secondSlotId = Number(secondSlot);

  assert.equal((await join(joiner.token, group.slotId)).status, 200);
  assert.equal((await join(joiner.token, secondSlotId)).status, 200);

  assert.equal(await memberCount(joiner.token, group, group.slotId), 1, 'left the first slot');
  assert.equal(await memberCount(joiner.token, group, secondSlotId), 1, 'now in the second slot');
});

test('join: an invalid slot id is rejected with 400', async () => {
  const { token } = await registerStudent();
  assert.equal((await join(token, 'abc')).status, 400);
  assert.equal((await join(token, 0)).status, 400);
  assert.equal((await join(token, undefined)).status, 400);
});

test('join: a slot that does not exist returns 404', async () => {
  const { token } = await registerStudent();
  const res = await join(token, 999999);
  assert.equal(res.status, 404);
});

test('join: unauthenticated request is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/study-groups/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: 1 }),
  });
  assert.equal(res.status, 401);
});

test('leave: a member can leave a group and the member count drops', async () => {
  const host = await registerStudent('Host');
  const joiner = await registerStudent('Leaver');
  const group = await createGroup(host.token);
  await join(joiner.token, group.slotId);

  const res = await leave(joiner.token, group.slotId);
  assert.equal(res.status, 200);
  assert.equal(await memberCount(host.token, group, group.slotId), 1);
});

test('leave: leaving a group you are not in returns 404', async () => {
  const host = await registerStudent('Host');
  const outsider = await registerStudent('Outsider');
  const group = await createGroup(host.token);

  const res = await leave(outsider.token, group.slotId);
  assert.equal(res.status, 404);
});

test('leave: unauthenticated request is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/study-groups/leave`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: 1 }),
  });
  assert.equal(res.status, 401);
});
