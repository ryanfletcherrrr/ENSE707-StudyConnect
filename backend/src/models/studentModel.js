// Data-access layer for the students table.
// Keeping raw SQL isolated here (rather than in controllers) supports the
// Maintainability NFR from the StudyConnect requirements doc: organised,
// understandable modules that are easy to change without introducing defects.

export function findByEmail(db, email) {
  return db
    .prepare('SELECT * FROM students WHERE email = ?')
    .get(email.toLowerCase().trim());
}

export function findById(db, id) {
  return db.prepare('SELECT * FROM students WHERE id = ?').get(id);
}

export function createStudent(db, { first_name, last_name, email, password_hash, course, bio }) {
  const result = db
    .prepare(
      `INSERT INTO students (first_name, last_name, email, password_hash, course, bio)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(first_name, last_name, email.toLowerCase().trim(), password_hash, course ?? null, bio ?? null);

  return findById(db, result.lastInsertRowid);
}

export function updateStudent(db, id, fields) {
  const allowed = ['first_name', 'last_name', 'course', 'bio'];
  const keysToUpdate = Object.keys(fields).filter((key) => allowed.includes(key));

  if (keysToUpdate.length === 0) {
    return findById(db, id);
  }

  const setClause = keysToUpdate.map((key) => `${key} = @${key}`).join(', ');
  db.prepare(
    `UPDATE students SET ${setClause}, updated_at = datetime('now') WHERE id = @id`
  ).run({ ...fields, id });

  return findById(db, id);
}

// Strips the password hash before sending a student record back to the client.
export function toPublicProfile(student) {
  if (!student) return null;
  const { password_hash, ...publicFields } = student;
  return publicFields;
}
