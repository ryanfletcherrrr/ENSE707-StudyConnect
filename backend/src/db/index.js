
// Uses Node's built-in SQLite module (stable in Node 22.5+) so the prototype
// runs with zero external dependencies - no native module compilation and
// no npm install required. See README.md for why this was chosen over
// better-sqlite3.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../utils/env.js';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow tests to point at an isolated in-memory or temp database via env var,
// while normal dev/start use the file configured in .env.
const dbFile = process.env.DB_FILE || './data/studyconnect.db';

if (dbFile !== ':memory:') {
  const resolvedDir = path.dirname(path.resolve(process.cwd(), dbFile));
  fs.mkdirSync(resolvedDir, { recursive: true });
}

function migrateStudyEvents(db) {
  const tableExists = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'study_events'
  `).get();

  if (!tableExists) {
    return;
  }

  const columns = db.prepare(
    'PRAGMA table_info(study_events)',
  ).all();

  const columnNames = columns.map((column) => column.name);

  if (columnNames.includes('study_group_id')) {
    return;
  }

  if (!columnNames.includes('slot_id')) {
    return;
  }

  const orphanedEvents = db.prepare(`
    SELECT COUNT(*) AS count
    FROM study_events AS events
    LEFT JOIN study_group_slots AS slots
      ON slots.id = events.slot_id
    WHERE slots.id IS NULL
  `).get();

  if (orphanedEvents.count > 0) {
    throw new Error(
      'Cannot migrate study_events: some events reference missing study group slots.',
    );
  }

  db.exec('PRAGMA foreign_keys = OFF');

  try {
    db.exec('BEGIN');

    db.exec(`
      CREATE TABLE study_events_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        study_group_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled'
          CHECK (status IN ('scheduled', 'cancelled')),
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (study_group_id) REFERENCES study_groups(id),
        FOREIGN KEY (created_by) REFERENCES students(id),
        CHECK (end_time > start_time)
      );

      INSERT INTO study_events_new (
        id,
        study_group_id,
        title,
        description,
        start_time,
        end_time,
        location,
        status,
        created_by,
        created_at
      )
      SELECT
        events.id,
        slots.study_group_id,
        events.title,
        events.description,
        events.start_time,
        events.end_time,
        events.location,
        events.status,
        events.created_by,
        events.created_at
      FROM study_events AS events
      JOIN study_group_slots AS slots
        ON slots.id = events.slot_id;

      DROP TABLE study_events;

      ALTER TABLE study_events_new RENAME TO study_events;
    `);

    db.exec('COMMIT');
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
    }

    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }

  const violations = db.prepare('PRAGMA foreign_key_check').all();

  if (violations.length > 0) {
    throw new Error(
      'Foreign-key violations detected after migrating study_events.',
    );
  }
}

export function createDb(file = dbFile) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  migrateStudyEvents(db);

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  return db;
}

// Default shared connection used by the running server.
const db = createDb();

export default db;
