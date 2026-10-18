export function createStudyEvent(db, {
    studyGroupId,
    title,
    description,
    startTime,
    endTime,
    location,
    createdBy,
    inviteeIds = [],
}) {
    db.exec('BEGIN');

    try {
        const result = db.prepare(`
            INSERT INTO study_events (
                study_group_id,
                title,
                description,
                start_time,
                end_time,
                location,
                created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            studyGroupId,
            title,
            description || null,
            startTime,
            endTime,
            location || null,
            createdBy
        );

        const eventId = Number(result.lastInsertRowid);

        const insertParticipant = db.prepare(`
            INSERT INTO study_event_participants (
                event_id,
                student_id
            )
            VALUES (?, ?)
        `);

        for (const studentId of inviteeIds) {
            if (studentId !== createdBy) {
                insertParticipant.run(eventId, studentId);
            }
        }

        db.exec('COMMIT');

        return findStudyEventById(db, eventId);
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}

export function findStudyEventById(db, eventId) {
    return db.prepare(`
        SELECT
            study_events.id,
            study_events.study_group_id,
            study_events.title,
            study_events.description,
            study_events.start_time,
            study_events.end_time,
            study_events.location,
            study_events.status,
            study_events.created_by,
            study_events.created_at,
            study_groups.group_name,
            study_groups.course,
            creator.first_name AS creator_first_name,
            creator.last_name AS creator_last_name
        FROM study_events
        JOIN study_groups
            ON study_groups.id = study_events.study_group_id
        JOIN students AS creator
            ON creator.id = study_events.created_by
        WHERE study_events.id = ?
    `).get(eventId);
}

export function findStudyEventsForStudent(db, studentId) {
    return db.prepare(`
        SELECT DISTINCT
            study_events.id,
            study_events.study_group_id,
            study_events.title,
            study_events.description,
            study_events.start_time,
            study_events.end_time,
            study_events.location,
            study_events.status,
            study_events.created_by,
            study_events.created_at,
            study_groups.group_name,
            study_groups.course,
            creator.first_name AS creator_first_name,
            creator.last_name AS creator_last_name,
            participants.invitation_status
        FROM study_events
        JOIN study_groups
            ON study_groups.id = study_events.study_group_id
        JOIN students AS creator
            ON creator.id = study_events.created_by
        LEFT JOIN study_event_participants AS participants
            ON participants.event_id = study_events.id
            AND participants.student_id = ?
        WHERE study_events.status = 'scheduled'
            AND (
                study_events.created_by = ?
                OR participants.student_id IS NOT NULL
            )
        ORDER BY study_events.start_time ASC, study_events.id ASC
    `).all(studentId, studentId);
}

export function findStudyEventParticipants(db, eventId) {
    return db.prepare(`
        SELECT
            participants.student_id,
            participants.invitation_status,
            participants.invited_at,
            participants.responded_at,
            students.first_name,
            students.last_name,
            students.email
        FROM study_event_participants AS participants
        JOIN students
            ON students.id = participants.student_id
        WHERE participants.event_id = ?
        ORDER BY students.first_name, students.last_name
    `).all(eventId);
}

export function searchStudents(db, searchTerm = '', excludeStudentId = null) {
    const search = `%${searchTerm.trim()}%`;

    return db.prepare(`
        SELECT
            id,
            first_name,
            last_name,
            email,
            course
        FROM students
        WHERE id != COALESCE(?, -1)
            AND (
                first_name LIKE ?
                OR last_name LIKE ?
                OR email LIKE ?
                OR COALESCE(course, '') LIKE ?
            )
        ORDER BY first_name, last_name
        LIMIT 50
    `).all(excludeStudentId, search, search, search, search);
}

export function findStudentsByIds(db, studentIds) {
    if (studentIds.length === 0) {
        return [];
    }

    const placeholders = studentIds.map(() => '?').join(', ');

    return db.prepare(`
        SELECT id
        FROM students
        WHERE id IN (${placeholders})
    `).all(...studentIds);
}

export function findStudyGroupById(db, studyGroupId) {
    return db.prepare(`
        SELECT id, group_name, course
        FROM study_groups
        WHERE id = ?
    `).get(studyGroupId);
}

export function updateStudyEvent(
    db,
    { eventId, title, description, startTime, endTime, location }
) {
    db.prepare(`
        UPDATE study_events
        SET
            title = ?,
            description = ?,
            start_time = ?,
            end_time = ?,
            location = ?
        WHERE id = ?
    `).run(
        title,
        description || null,
        startTime,
        endTime,
        location || null,
        eventId
    );

    return findStudyEventById(db, eventId);
}

export function syncStudyEventParticipants(db, eventId, inviteeIds) {
    db.exec('BEGIN');

    try {
        const selectedIds = [...new Set(inviteeIds)];

        if (selectedIds.length === 0) {
            db.prepare(`
                DELETE FROM study_event_participants
                WHERE event_id = ?
            `).run(eventId);
        } else {
            const placeholders = selectedIds.map(() => '?').join(', ');

            db.prepare(`
                DELETE FROM study_event_participants
                WHERE event_id = ?
                    AND student_id NOT IN (${placeholders})
            `).run(eventId, ...selectedIds);

            const insertParticipant = db.prepare(`
                INSERT OR IGNORE INTO study_event_participants (
                    event_id,
                    student_id
                )
                VALUES (?, ?)
            `);

            for (const studentId of selectedIds) {
                insertParticipant.run(eventId, studentId);
            }
        }

        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }

    return findStudyEventParticipants(db, eventId);
}

export function cancelStudyEvent(db, eventId) {
    db.prepare(`
        UPDATE study_events
        SET status = 'cancelled'
        WHERE id = ?
    `).run(eventId);

    return findStudyEventById(db, eventId);
}

export function isStudentInvitedToEvent(db, eventId, studentId) {
    return db.prepare(`
        SELECT id
        FROM study_event_participants
        WHERE event_id = ?
            AND student_id = ?
    `).get(eventId, studentId);
}

export function isStudentEventCreator(db, eventId, studentId) {
    return db.prepare(`
        SELECT id
        FROM study_events
        WHERE id = ?
            AND created_by = ?
    `).get(eventId, studentId);
}

export function isStudentInStudyGroup(db, studyGroupId, studentId) {
    return db.prepare(`
        SELECT study_group_members.id
        FROM study_group_members
        JOIN study_group_slots
            ON study_group_slots.id = study_group_members.slot_id
        WHERE study_group_slots.study_group_id = ?
            AND study_group_members.student_id = ?
        LIMIT 1
    `).get(studyGroupId, studentId);
}

export function findStudyEventsCreatedByStudent(db, studentId) {
    return db.prepare(`
        SELECT
            se.*,
            sg.group_name
        FROM study_events se
        LEFT JOIN study_groups sg
            ON sg.id = se.study_group_id
        WHERE se.created_by = ?
            AND se.status = 'scheduled'
            AND se.start_time > ?
        ORDER BY se.start_time ASC
    `).all(studentId, new Date().toISOString());
}
