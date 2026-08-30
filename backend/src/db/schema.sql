-- StudyConnect prototype schema
-- Covers FR-01 (login) and FR-02 (profile management) only.
-- Additional tables (groups, messages, resources, events) are out of scope
-- for this first slice and will be added when those features are built.

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