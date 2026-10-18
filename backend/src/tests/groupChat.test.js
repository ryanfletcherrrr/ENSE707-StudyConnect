// Tests the Group Chat feature over real HTTP: members of a group slot can
// read and send messages and see who is in the chat; everyone else is
// rejected.

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

async function registerStudent(label = 'Chat') {
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

// Creates a group (the creator is placed in its first slot) and returns that slot id.
async function createGroupWithSlot(token) {
  const created = await fetch(`${server.baseUrl}/study-groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      group_name: 'Chat Test Group',
      course: 'ENSE707',
      description: 'A group for testing the group chat.',
      capacity: 4,
    }),
  });
  const { group } = await created.json();

  const slotsRes = await fetch(`${server.baseUrl}/study-groups/${group.id}/slots`, {
    headers: authHeaders(token),
  });
  const { slots } = await slotsRes.json();

  return slots[0].id;
}

function messagesUrl(slotId) {
  return `${server.baseUrl}/chat/slots/${slotId}/messages`;
}

test('chat: a member can send a message and read it back', async () => {
  const member = await registerStudent('Sender');
  const slotId = await createGroupWithSlot(member.token);

  const sent = await fetch(messagesUrl(slotId), {
    method: 'POST',
    headers: authHeaders(member.token),
    body: JSON.stringify({ message: '  See you at 3pm  ' }),
  });
  const sentData = await sent.json();
  const list = await fetch(messagesUrl(slotId), {
    headers: authHeaders(member.token),
  });
  const listData = await list.json();

  assert.equal(sent.status, 201);
  assert.ok(sentData.chatMessage);
  assert.equal(list.status, 200);
  assert.equal(listData.messages.length, 1);
  assert.equal(listData.messages[0].message, 'See you at 3pm');
});

test('chat: a member can list the people in the chat', async () => {
  const member = await registerStudent('Lister');
  const slotId = await createGroupWithSlot(member.token);

  const res = await fetch(`${server.baseUrl}/chat/slots/${slotId}/members`, {
    headers: authHeaders(member.token),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.members.length, 1);
});

test('chat: an empty or over-long message is rejected with 400', async () => {
  const member = await registerStudent('Typist');
  const slotId = await createGroupWithSlot(member.token);

  for (const message of ['', '   ', 'x'.repeat(1001)]) {
    const res = await fetch(messagesUrl(slotId), {
      method: 'POST',
      headers: authHeaders(member.token),
      body: JSON.stringify({ message }),
    });
    assert.equal(res.status, 400);
  }
});

test('chat: a student outside the group cannot read, send or list members', async () => {
  const owner = await registerStudent('Owner');
  const outsider = await registerStudent('Outsider');
  const slotId = await createGroupWithSlot(owner.token);

  const read = await fetch(messagesUrl(slotId), {
    headers: authHeaders(outsider.token),
  });
  const send = await fetch(messagesUrl(slotId), {
    method: 'POST',
    headers: authHeaders(outsider.token),
    body: JSON.stringify({ message: 'Let me in' }),
  });
  const members = await fetch(`${server.baseUrl}/chat/slots/${slotId}/members`, {
    headers: authHeaders(outsider.token),
  });

  assert.equal(read.status, 403);
  assert.equal(send.status, 403);
  assert.equal(members.status, 403);
});

test('chat: an unknown slot returns 404 and a malformed slot id returns 400', async () => {
  const student = await registerStudent('Lost');

  const missing = await fetch(messagesUrl(999999), {
    headers: authHeaders(student.token),
  });
  const invalid = await fetch(messagesUrl('abc'), {
    headers: authHeaders(student.token),
  });

  assert.equal(missing.status, 404);
  assert.equal(invalid.status, 400);
});

test('chat: an unauthenticated request is rejected with 401', async () => {
  const member = await registerStudent('Anon');
  const slotId = await createGroupWithSlot(member.token);

  const res = await fetch(messagesUrl(slotId));

  assert.equal(res.status, 401);
});
