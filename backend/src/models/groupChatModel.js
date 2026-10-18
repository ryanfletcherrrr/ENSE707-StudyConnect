export function findChatMessages(db, slotId) {
  return db
    .prepare(`
      SELECT
        group_chat_messages.id,
        group_chat_messages.slot_id,
        group_chat_messages.student_id,
        group_chat_messages.message,
        group_chat_messages.created_at,
        students.first_name,
        students.last_name
      FROM group_chat_messages
      JOIN students
        ON students.id = group_chat_messages.student_id
      WHERE group_chat_messages.slot_id = ?
      ORDER BY group_chat_messages.created_at ASC,
               group_chat_messages.id ASC
    `)
    .all(slotId);
}

export function createChatMessage(db, { slotId, studentId, message }) {
  const result = db
    .prepare(`
      INSERT INTO group_chat_messages
        (slot_id, student_id, message)
      VALUES (?, ?, ?)
    `)
    .run(slotId, studentId, message);

  return db
    .prepare(`
      SELECT
        group_chat_messages.id,
        group_chat_messages.slot_id,
        group_chat_messages.student_id,
        group_chat_messages.message,
        group_chat_messages.created_at,
        students.first_name,
        students.last_name
      FROM group_chat_messages
      JOIN students
        ON students.id = group_chat_messages.student_id
      WHERE group_chat_messages.id = ?
    `)
    .get(result.lastInsertRowid);
}

export function findChatMembers(db, slotId) {
  return db
    .prepare(`
      SELECT
        students.id,
        students.first_name,
        students.last_name
      FROM study_group_members
      JOIN students
        ON students.id = study_group_members.student_id
      WHERE study_group_members.slot_id = ?
      ORDER BY study_group_members.joined_at ASC,
               study_group_members.id ASC
    `)
    .all(slotId);
}

export function isStudentInChatSlot(db, slotId, studentId) {
  return db
    .prepare(`
      SELECT study_group_members.id
      FROM study_group_members
      WHERE study_group_members.slot_id = ?
        AND study_group_members.student_id = ?
    `)
    .get(slotId, studentId);
}

export function findChatSlot(db, slotId) {
  return db
    .prepare(`
      SELECT id
      FROM study_group_slots
      WHERE id = ?
    `)
    .get(slotId);
}
