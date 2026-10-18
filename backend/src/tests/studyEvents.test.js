// Tests the Study Events feature end to end over real HTTP.
// Covers creating, listing, viewing, editing and cancelling events, the
// invitee search, and the permission and validation rules around them.

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

async function registerStudent(label = 'Event') {
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
      group_name: 'Event Test Group',
      course: 'ENSE707',
      description: 'A group for testing study events.',
      capacity: 4,
    }),
  });

  assert.equal(res.status, 201);
  return (await res.json()).group;
}

function eventBody(groupId, overrides = {}) {
  return {
    study_group_id: groupId,
    title: 'Revision session',
    description: 'Past paper practice',
    start_time: '2030-05-01T10:00:00.000Z',
    end_time: '2030-05-01T11:00:00.000Z',
    location: 'WG building, room 101',
    invitee_ids: [],
    ...overrides,
  };
}

async function createEvent(token, body) {
  return fetch(`${server.baseUrl}/study-events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

async function setup(inviteCount = 1) {
  const creator = await registerStudent('Creator');
  const invitees = [];
  for (let i = 0; i < inviteCount; i += 1) {
    invitees.push(await registerStudent(`Invitee${i}`));
  }
  const group = await createGroup(creator.token);
  return { creator, invitees, group };
}

test('study events: a group member can create an event and invite students', async () => {
  const { creator, invitees, group } = await setup();

  const res = await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
  );
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.event.title, 'Revision session');
  assert.equal(data.event.study_group_id, group.id);
  assert.equal(data.event.status, 'scheduled');
  assert.equal(data.event.created_by, creator.studentId);
});

test('study events: the creator and invitee both see the event in their list', async () => {
  const { creator, invitees, group } = await setup();
  await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
  );

  for (const student of [creator, invitees[0]]) {
    const res = await fetch(`${server.baseUrl}/study-events`, {
      headers: authHeaders(student.token),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.events.length, 1);
    assert.equal(data.events[0].title, 'Revision session');
  }
});

test('study events: an uninvolved student sees no events', async () => {
  const { creator, group } = await setup(0);
  const stranger = await registerStudent('Stranger');
  await createEvent(creator.token, eventBody(group.id));

  const res = await fetch(`${server.baseUrl}/study-events`, {
    headers: authHeaders(stranger.token),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(data.events, []);
});

test('study events: managed events lists only events the student created', async () => {
  const { creator, invitees, group } = await setup();
  await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
  );

  const mine = await (
    await fetch(`${server.baseUrl}/study-events/managed`, {
      headers: authHeaders(creator.token),
    })
  ).json();
  const theirs = await (
    await fetch(`${server.baseUrl}/study-events/managed`, {
      headers: authHeaders(invitees[0].token),
    })
  ).json();

  assert.equal(mine.events.length, 1);
  assert.equal(theirs.events.length, 0);
});

test('study events: the creator can view an event with its participants', async () => {
  const { creator, invitees, group } = await setup();
  const created = await (
    await createEvent(
      creator.token,
      eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
    )
  ).json();

  const res = await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
    headers: authHeaders(creator.token),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.event.id, created.event.id);
  assert.equal(data.participants.length, 1);
  assert.equal(data.participants[0].student_id, invitees[0].studentId);
  assert.equal(data.participants[0].invitation_status, 'pending');
});

test('study events: an invited student can view the event', async () => {
  const { creator, invitees, group } = await setup();
  const created = await (
    await createEvent(
      creator.token,
      eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
    )
  ).json();

  const res = await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
    headers: authHeaders(invitees[0].token),
  });

  assert.equal(res.status, 200);
});

test('study events: a student who is neither creator nor invited gets 403', async () => {
  const { creator, group } = await setup(0);
  const stranger = await registerStudent('Stranger');
  const created = await (
    await createEvent(creator.token, eventBody(group.id))
  ).json();

  const res = await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
    headers: authHeaders(stranger.token),
  });

  assert.equal(res.status, 403);
});

test('study events: viewing an unknown event returns 404 and a bad id returns 400', async () => {
  const student = await registerStudent('Viewer');

  const missing = await fetch(`${server.baseUrl}/study-events/999999`, {
    headers: authHeaders(student.token),
  });
  const invalid = await fetch(`${server.baseUrl}/study-events/abc`, {
    headers: authHeaders(student.token),
  });

  assert.equal(missing.status, 404);
  assert.equal(invalid.status, 400);
});

test('study events: an unauthenticated request is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/study-events`);

  assert.equal(res.status, 401);
});

test('study events: a non-member of the group cannot create an event', async () => {
  const { group } = await setup(0);
  const outsider = await registerStudent('Outsider');

  const res = await createEvent(outsider.token, eventBody(group.id));

  assert.equal(res.status, 403);
});

test('study events: creating an event for an unknown group returns 404', async () => {
  const student = await registerStudent('Lost');

  const res = await createEvent(student.token, eventBody(999999));

  assert.equal(res.status, 404);
});

test('study events: an invalid study group id is rejected with 400', async () => {
  const student = await registerStudent('BadGroup');

  const res = await createEvent(student.token, eventBody('not-a-number'));

  assert.equal(res.status, 400);
});

test('study events: invalid event details are rejected with a list of errors', async () => {
  const { creator, group } = await setup(0);

  const res = await createEvent(
    creator.token,
    eventBody(group.id, { title: '', start_time: 'nonsense', end_time: undefined })
  );
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.ok(data.details.length >= 3);
});

test('study events: an end time before the start time is rejected', async () => {
  const { creator, group } = await setup(0);

  const res = await createEvent(
    creator.token,
    eventBody(group.id, {
      start_time: '2030-05-01T11:00:00.000Z',
      end_time: '2030-05-01T10:00:00.000Z',
    })
  );
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.ok(data.details.some((message) => message.includes('End time')));
});

test('study events: an over-long description and location are rejected', async () => {
  const { creator, group } = await setup(0);

  const res = await createEvent(
    creator.token,
    eventBody(group.id, {
      description: 'd'.repeat(1001),
      location: 'l'.repeat(501),
    })
  );
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.details.length, 2);
});

test('study events: invitee_ids must be an array of valid ids', async () => {
  const { creator, group } = await setup(0);

  const notArray = await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: 'everyone' })
  );
  const badIds = await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: [1, -5] })
  );

  assert.equal(notArray.status, 400);
  assert.equal(badIds.status, 400);
});

test('study events: inviting a student who does not exist is rejected', async () => {
  const { creator, group } = await setup(0);

  const res = await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: [999999] })
  );

  assert.equal(res.status, 400);
});

test('study events: the creator is not added as their own invitee', async () => {
  const { creator, group } = await setup(0);

  const res = await createEvent(
    creator.token,
    eventBody(group.id, { invitee_ids: [creator.studentId] })
  );
  const data = await res.json();
  const detail = await (
    await fetch(`${server.baseUrl}/study-events/${data.event.id}`, {
      headers: authHeaders(creator.token),
    })
  ).json();

  assert.equal(res.status, 201);
  assert.equal(detail.participants.length, 0);
});

test('study events: the creator can edit details and replace the invitees', async () => {
  const { creator, invitees, group } = await setup(2);
  const created = await (
    await createEvent(
      creator.token,
      eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
    )
  ).json();

  const res = await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
    method: 'PATCH',
    headers: authHeaders(creator.token),
    body: JSON.stringify({
      title: 'Moved session',
      start_time: '2030-05-02T10:00:00.000Z',
      end_time: '2030-05-02T12:00:00.000Z',
      invitee_ids: [invitees[1].studentId],
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.event.title, 'Moved session');

  const detail = await (
    await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
      headers: authHeaders(creator.token),
    })
  ).json();
  assert.deepEqual(
    detail.participants.map((p) => p.student_id),
    [invitees[1].studentId]
  );
});

test('study events: editing without invitee_ids keeps the invitees, and an empty list removes them', async () => {
  const { creator, invitees, group } = await setup();
  const created = await (
    await createEvent(
      creator.token,
      eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
    )
  ).json();
  const patch = (body) =>
    fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
      method: 'PATCH',
      headers: authHeaders(creator.token),
      body: JSON.stringify({
        title: 'Same session',
        start_time: '2030-05-01T10:00:00.000Z',
        end_time: '2030-05-01T11:00:00.000Z',
        ...body,
      }),
    });
  const participants = async () =>
    (
      await (
        await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
          headers: authHeaders(creator.token),
        })
      ).json()
    ).participants;

  assert.equal((await patch({})).status, 200);
  assert.equal((await participants()).length, 1);

  assert.equal((await patch({ invitee_ids: [] })).status, 200);
  assert.equal((await participants()).length, 0);
});

test('study events: editing rejects bad invitees and bad details', async () => {
  const { creator, group } = await setup(0);
  const created = await (
    await createEvent(creator.token, eventBody(group.id))
  ).json();
  const patch = (body) =>
    fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
      method: 'PATCH',
      headers: authHeaders(creator.token),
      body: JSON.stringify(body),
    });
  const valid = {
    title: 'Edited',
    start_time: '2030-05-01T10:00:00.000Z',
    end_time: '2030-05-01T11:00:00.000Z',
  };

  assert.equal((await patch({ ...valid, title: '' })).status, 400);
  assert.equal((await patch({ ...valid, invitee_ids: 'all' })).status, 400);
  assert.equal((await patch({ ...valid, invitee_ids: [999999] })).status, 400);
});

test('study events: only the creator can edit or cancel an event', async () => {
  const { creator, invitees, group } = await setup();
  const created = await (
    await createEvent(
      creator.token,
      eventBody(group.id, { invitee_ids: [invitees[0].studentId] })
    )
  ).json();

  const edit = await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
    method: 'PATCH',
    headers: authHeaders(invitees[0].token),
    body: JSON.stringify({
      title: 'Hijack',
      start_time: '2030-05-01T10:00:00.000Z',
      end_time: '2030-05-01T11:00:00.000Z',
    }),
  });
  const cancel = await fetch(`${server.baseUrl}/study-events/${created.event.id}`, {
    method: 'DELETE',
    headers: authHeaders(invitees[0].token),
  });

  assert.equal(edit.status, 403);
  assert.equal(cancel.status, 403);
});

test('study events: editing or cancelling an unknown or malformed event id fails cleanly', async () => {
  const student = await registerStudent('Nobody');
  const headers = authHeaders(student.token);

  const missingEdit = await fetch(`${server.baseUrl}/study-events/999999`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({}),
  });
  const invalidEdit = await fetch(`${server.baseUrl}/study-events/abc`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({}),
  });
  const missingCancel = await fetch(`${server.baseUrl}/study-events/999999`, {
    method: 'DELETE',
    headers,
  });
  const invalidCancel = await fetch(`${server.baseUrl}/study-events/abc`, {
    method: 'DELETE',
    headers,
  });

  assert.equal(missingEdit.status, 404);
  assert.equal(invalidEdit.status, 400);
  assert.equal(missingCancel.status, 404);
  assert.equal(invalidCancel.status, 400);
});

test('study events: cancelling removes the event from lists and blocks further edits', async () => {
  const { creator, group } = await setup(0);
  const created = await (
    await createEvent(creator.token, eventBody(group.id))
  ).json();
  const url = `${server.baseUrl}/study-events/${created.event.id}`;

  const cancel = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(creator.token),
  });
  const cancelled = await cancel.json();
  const again = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(creator.token),
  });
  const edit = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(creator.token),
    body: JSON.stringify({
      title: 'Too late',
      start_time: '2030-05-01T10:00:00.000Z',
      end_time: '2030-05-01T11:00:00.000Z',
    }),
  });
  const list = await (
    await fetch(`${server.baseUrl}/study-events`, {
      headers: authHeaders(creator.token),
    })
  ).json();

  assert.equal(cancel.status, 200);
  assert.equal(cancelled.event.status, 'cancelled');
  assert.equal(again.status, 409);
  assert.equal(edit.status, 409);
  assert.deepEqual(list.events, []);
});

test('study events: student search finds others by name and excludes the caller', async () => {
  const searcher = await registerStudent('Searcher');
  const target = await registerStudent('Zebulon');

  const res = await fetch(`${server.baseUrl}/study-events/students?search=Zebulon`, {
    headers: authHeaders(searcher.token),
  });
  const data = await res.json();
  const self = await (
    await fetch(`${server.baseUrl}/study-events/students?search=Searcher`, {
      headers: authHeaders(searcher.token),
    })
  ).json();

  assert.equal(res.status, 200);
  // Only the matching student comes back: the search term must be applied.
  assert.deepEqual(
    data.students.map((s) => s.id),
    [target.studentId]
  );
  assert.ok(!self.students.some((s) => s.id === searcher.studentId));
});

test('study events: student search works with no term and rejects an over-long term', async () => {
  const student = await registerStudent('Browser');

  const empty = await fetch(`${server.baseUrl}/study-events/students`, {
    headers: authHeaders(student.token),
  });
  const tooLong = await fetch(
    `${server.baseUrl}/study-events/students?search=${'x'.repeat(101)}`,
    { headers: authHeaders(student.token) }
  );

  assert.equal(empty.status, 200);
  assert.equal(tooLong.status, 400);
});
