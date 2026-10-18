import db from '../db/index.js';

export function getNotificationsByStudent(studentId) {
  

  return db
    .prepare(`
      SELECT id, student_id, type, title, message, is_read, created_at
      FROM notifications
      WHERE student_id = ?
      ORDER BY created_at DESC, id DESC
    `)
    .all(studentId);
}

export function getNotificationById(studentId, notificationId) {
  

  return db
    .prepare(`
      SELECT id, student_id, type, title, message, is_read, created_at
      FROM notifications
      WHERE id = ? AND student_id = ?
    `)
    .get(notificationId, studentId);
}

export function markNotificationAsRead(studentId, notificationId) {
  

  return db
    .prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND student_id = ?
    `)
    .run(notificationId, studentId);
}

export function createNotification({
  studentId,
  type,
  title,
  message,
}) {
  

  const result = db
    .prepare(`
      INSERT INTO notifications (student_id, type, title, message)
      VALUES (?, ?, ?, ?)
    `)
    .run(studentId, type, title, message);

  return getNotificationById(studentId, result.lastInsertRowid);
}