// Data-access layer for study groups.
// Raw SQL stays here so controllers remain focused on request handling.

export function findGroupsByCourse(db, course) {
    return db
      .prepare(`
        SELECT
          study_groups.id,
          study_groups.group_name,
          study_groups.course,
          study_groups.description,
          study_groups.created_by,
          study_groups.created_at
        FROM study_groups
        WHERE LOWER(study_groups.course) = LOWER(?)
        ORDER BY study_groups.created_at DESC
      `)
      .all(course.trim());
  }

  export function joinStudyGroup(db, slotId, studentId) {
    // Checks if the selected group exists
    const slot = db
      .prepare(`
        SELECT
          study_group_slots.id,
          study_group_slots.study_group_id,
          study_group_slots.group_number,
          study_group_slots.capacity,
          COUNT(study_group_members.id) AS member_count
        FROM study_group_slots
        LEFT JOIN study_group_members
          ON study_group_members.slot_id = study_group_slots.id
        WHERE study_group_slots.id = ?
        GROUP BY study_group_slots.id
      `)
      .get(slotId);
  
    if (!slot) {
      const error = new Error('Study group not found.');
      error.status = 404;
      throw error;
    }
  
    // Checks whether the student is already in this group
    const existingMember = db
      .prepare(`
        SELECT
          study_group_members.id,
          study_group_members.slot_id,
          study_group_slots.group_number
        FROM study_group_members
        JOIN study_group_slots
          ON study_group_slots.id = study_group_members.slot_id
        WHERE study_group_members.student_id = ?
          AND study_group_slots.study_group_id = ?
      `)
      .get(studentId, slot.study_group_id);
  
    if (existingMember && existingMember.slot_id === slot.id) {
      const error = new Error('You have already joined this group.');
      error.status = 409;
      throw error;
    }
  
    // Checks whether the group has reached its capacity
    if (slot.member_count >= slot.capacity) {
      const error = new Error('This group is full.');
      error.status = 409;
      throw error;
    }
  
    // Removes the student from their previous group
    if (existingMember) {
      db
        .prepare(`
          DELETE FROM study_group_members
          WHERE id = ?
        `)
        .run(existingMember.id);
    }
  
    // Adds the student to the group
    db.prepare(`
      INSERT INTO study_group_members (slot_id, student_id)
      VALUES (?, ?)
    `).run(slotId, studentId);
  
    return {
      slotId: slot.id,
      groupNumber: slot.group_number,
      memberCount: slot.member_count + 1,
      capacity: slot.capacity,
    };
  }

export function findStudyGroupSlots(db, studyGroupId) {
  return db
    .prepare(`
      SELECT
        study_group_slots.id,
        study_group_slots.study_group_id,
        study_group_slots.group_number,
        study_group_slots.capacity,
        COUNT(study_group_members.id) AS member_count
      FROM study_group_slots
      LEFT JOIN study_group_members
        ON study_group_members.slot_id = study_group_slots.id
      WHERE study_group_slots.study_group_id = ?
      GROUP BY
        study_group_slots.id,
        study_group_slots.study_group_id,
        study_group_slots.group_number,
        study_group_slots.capacity
      ORDER BY study_group_slots.group_number ASC
    `)
    .all(studyGroupId);
}