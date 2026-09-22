// Covers FR-03 (search by course) and acceptance criteria AC-06 and AC-07.

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
    email: `search.${Date.now()}.${Math.random().toString(36).slice(2)}@aut.ac.nz`,
    password: 'Password123!',
    course: 'ENSE707',
  };

  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  return {
    token: data.token,
    studentId: data.student.id,
  };
}

// AC-06: matching study groups are returned for a supported course.
test('course search (AC-06): ENSE707 returns matching study groups', async () => {
    const { token, studentId } = await registerStudent();
  
    const { default: db } = await import('../db/index.js');
  
    db.prepare(`
      INSERT INTO study_groups (
        group_name,
        course,
        description,
        created_by
      )
      VALUES (?, ?, ?, ?)
    `).run(
      'ENSE707 Test Study Group',
      'ENSE707',
      'Test group for automated course search.',
      studentId
    );
  
    const res = await fetch(
      `${server.baseUrl}/study-groups?course=ENSE707`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  
    const data = await res.json();
  
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.groups));
    assert.ok(data.groups.length > 0);
  
    for (const group of data.groups) {
      assert.equal(group.course.toLowerCase(), 'ense707');
    }
  });
  

// AC-07: a course with no matching groups returns an empty result.
test('course search (AC-07): unknown course returns no groups', async () => {
  const { token } = await registerStudent();

  const res = await fetch(
    `${server.baseUrl}/study-groups?course=FAKE999`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(data.groups, []);
});

// Security: the search endpoint requires authentication.
test('course search: unauthenticated request is rejected with 401', async () => {
  const res = await fetch(
    `${server.baseUrl}/study-groups?course=ENSE707`
  );

  assert.equal(res.status, 401);
});

// Validation: the course parameter is required.
test('course search: missing course is rejected with 400', async () => {
  const { token } = await registerStudent();

  const res = await fetch(
    `${server.baseUrl}/study-groups`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(typeof data.error, 'string');
});