// Tests the one-off migration that moves study_events from the old
// slot-based layout (slot_id) to the group-based layout (study_group_id).
// It rebuilds a table, so it is worth checking it keeps existing events.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

process.env.DB_FILE = ':memory:';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';

const { createDb } = await import('../db/index.js');

function makeLegacyDb(file, { orphan = false } = {}) {
  const legacy = new DatabaseSync(file);
  legacy.exec(`
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      course TEXT, bio TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE study_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL, course TEXT NOT NULL, description TEXT,
      capacity INTEGER, created_by INTEGER, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE study_group_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      study_group_id INTEGER NOT NULL, group_number INTEGER, capacity INTEGER
    );
    CREATE TABLE study_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO students (first_name, last_name, email, password_hash)
      VALUES ('Old', 'Creator', 'old@aut.ac.nz', 'x');
    INSERT INTO study_groups (group_name, course, created_by) VALUES ('Legacy', 'ENSE707', 1);
    INSERT INTO study_group_slots (study_group_id, group_number, capacity) VALUES (1, 1, 4);
    INSERT INTO study_events (slot_id, title, start_time, end_time, created_by)
      VALUES (${orphan ? 99 : 1}, 'Legacy event', '2030-01-01T10:00:00.000Z', '2030-01-01T11:00:00.000Z', 1);
  `);
  legacy.close();
}

test('migration: an old slot-based events table keeps its events under study_group_id', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyconnect-migration-'));
  const file = path.join(dir, 'legacy.db');

  try {
    makeLegacyDb(file);

    const db = createDb(file);
    const columns = db.prepare('PRAGMA table_info(study_events)').all().map((c) => c.name);
    const events = db.prepare('SELECT study_group_id, title FROM study_events').all();
    db.close();

    assert.ok(columns.includes('study_group_id'));
    assert.ok(!columns.includes('slot_id'));
    assert.equal(events.length, 1);
    assert.equal(events[0].title, 'Legacy event');
    assert.equal(events[0].study_group_id, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('migration: an event pointing at a missing slot stops the migration with a clear error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyconnect-migration-'));
  const file = path.join(dir, 'orphan.db');

  try {
    makeLegacyDb(file, { orphan: true });

    assert.throws(() => createDb(file), /missing study group slots/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('migration: a database that is already up to date is left alone', () => {
  const db = createDb(':memory:');
  const before = db.prepare('PRAGMA table_info(study_events)').all().length;
  db.close();

  const again = createDb(':memory:');
  const after = again.prepare('PRAGMA table_info(study_events)').all().length;
  again.close();

  assert.equal(before, after);
});
