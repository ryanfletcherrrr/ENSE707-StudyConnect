// Tests the Reminders and Notifications feature.
// Authenticated students can view their own notifications and mark them as read,
// while unauthorized access and invalid notification IDs are rejected.

import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import { createNotification } from '../models/notificationModel.js';

let server;

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server.close();
});

async function registerStudent(label = 'Notification') {
  const res = await fetch(`${server.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: label,
      last_name: 'Student',
      email: `${label.toLowerCase()}.${Date.now()}.${Math.random()
        .toString(36)
        .slice(2)}@aut.ac.nz`,
      password: 'Password123!',
      course: 'ENSE707',
    }),
  });

  const data = await res.json();

  return {
    token: data.token,
    studentId: data.student.id,
  };
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

test('notifications: authenticated student can view their notifications', async () => {
  const student = await registerStudent('Viewer');

  createNotification({
    studentId: student.studentId,
    type: 'reminder',
    title: 'Study Reminder',
    message: 'Remember your ENSE707 study session.',
  });

  const res = await fetch(`${server.baseUrl}/notifications`, {
    headers: authHeaders(student.token),
  });

  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.notifications.length, 1);
  assert.equal(data.notifications[0].title, 'Study Reminder');
  assert.equal(data.notifications[0].is_read, 0);
});

test('notifications: student can mark their notification as read', async () => {
  const student = await registerStudent('Reader');

  const notification = createNotification({
    studentId: student.studentId,
    type: 'reminder',
    title: 'Upcoming Session',
    message: 'Your study session is coming up.',
  });

  const res = await fetch(
    `${server.baseUrl}/notifications/${notification.id}/read`,
    {
      method: 'PATCH',
      headers: authHeaders(student.token),
    }
  );

  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.notification.is_read, 1);
});

test('notifications: unauthenticated request is rejected with 401', async () => {
  const res = await fetch(`${server.baseUrl}/notifications`);

  assert.equal(res.status, 401);
});

test('notifications: student cannot access another student notification', async () => {
  const owner = await registerStudent('Owner');
  const outsider = await registerStudent('Outsider');

  const notification = createNotification({
    studentId: owner.studentId,
    type: 'reminder',
    title: 'Private Reminder',
    message: 'This reminder belongs to the owner.',
  });

  const res = await fetch(
    `${server.baseUrl}/api/notifications/${notification.id}`,
    {
      headers: authHeaders(outsider.token),
    }
  );

  assert.equal(res.status, 404);
});

test('notifications: invalid notification ID is rejected with 400', async () => {
  const student = await registerStudent('InvalidId');

  const res = await fetch(
    `${server.baseUrl}/notifications/not-a-number/read`,
    {
      method: 'PATCH',
      headers: authHeaders(student.token),
    }
  );

  assert.equal(res.status, 400);
});