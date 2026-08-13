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
