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

export function createDb(file = dbFile) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Hotfix: ensure notifications table exists even if schema drift occurs.
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_student
      ON notifications(student_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_created_at
      ON notifications(created_at);
  `);

  return db;
}

// Default shared connection used by the running server.
const db = createDb();

export default db;
