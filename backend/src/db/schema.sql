CREATE TABLE IF NOT EXISTS students (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    course        TEXT,              -- primary course code, e.g. "ENSE707"
    bio           TEXT,              -- short "about me" text
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

CREATE TABLE IF NOT EXISTS study_groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name  TEXT NOT NULL,
    course      TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by  INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_study_groups_course ON study_groups(course);

CREATE TABLE IF NOT EXISTS study_group_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_group_id INTEGER NOT NULL,
    group_number INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 6,
    FOREIGN KEY (study_group_id) REFERENCES study_groups(id),
    UNIQUE (study_group_id, group_number)
);

CREATE TABLE IF NOT EXISTS study_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (slot_id) REFERENCES study_group_slots(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE (slot_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_study_group_slots_group
    ON study_group_slots(study_group_id);

CREATE INDEX IF NOT EXISTS idx_study_group_members_slot
    ON study_group_members(slot_id);

CREATE INDEX IF NOT EXISTS idx_study_group_members_student
    ON study_group_members(student_id);

CREATE TABLE IF NOT EXISTS learning_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    study_group_id INTEGER NOT NULL,
    shared_by INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (study_group_id) REFERENCES study_groups(id),
    FOREIGN KEY (shared_by) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_learning_resources_group
    ON learning_resources(study_group_id);

CREATE TABLE IF NOT EXISTS group_chat_messages (
-- Notifications table: restored so tests and notification model work
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (slot_id) REFERENCES study_group_slots(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_student
    ON notifications(student_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at);

-- Group chat messages table: keep new feature table
CREATE TABLE IF NOT EXISTS group_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (slot_id) REFERENCES study_group_slots(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_group_chat_messages_slot
    ON group_chat_messages(slot_id);

CREATE INDEX IF NOT EXISTS idx_group_chat_messages_student
    ON group_chat_messages(student_id);
