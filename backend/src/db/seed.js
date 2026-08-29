// Seeds sample student accounts for local development and manual testing.
// Run with: npm run seed
import { hashPassword } from '../utils/password.js';
import { createDb } from './index.js';

const db = createDb();

const sampleStudents = [
  {
    first_name: 'Ava',
    last_name: 'Ngata',
    email: 'ava.ngata@aut.ac.nz',
    password: 'Password123!',
    course: 'ENSE707',
    bio: 'Third-year software engineering student, keen on group study for ENSE707.',
  },
  {
    first_name: 'Liam',
    last_name: 'Chen',
    email: 'liam.chen@aut.ac.nz',
    password: 'Password123!',
    course: 'ENSE707',
    bio: 'Looking for a Software Quality Assurance study group.',
  },
];

const insert = db.prepare(`
  INSERT INTO students (first_name, last_name, email, password_hash, course, bio)
  VALUES (@first_name, @last_name, @email, @password_hash, @course, @bio)
  ON CONFLICT(email) DO NOTHING
`);

for (const student of sampleStudents) {
  const password_hash = hashPassword(student.password);
  insert.run({
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email,
    password_hash,
    course: student.course,
    bio: student.bio,
  });
}

const ava = db
  .prepare('SELECT id FROM students WHERE email = ?')
  .get('ava.ngata@aut.ac.nz');

const sampleGroups = [
  {
    group_name: 'ENSE707 Study Group',
    course: 'ENSE707',
    description: 'Study group for ENSE707 assignments and exam preparation.',
    created_by: ava.id,
  },
  {
    group_name: 'Software Quality Study Session',
    course: 'ENSE707',
    description: 'Weekly study sessions focused on software quality assurance.',
    created_by: ava.id,
  },
];

const insertGroup = db.prepare(`
  INSERT INTO study_groups (group_name, course, description, created_by)
  SELECT @group_name, @course, @description, @created_by
  WHERE NOT EXISTS (
    SELECT 1
    FROM study_groups
    WHERE group_name = @group_name
      AND course = @course
      AND created_by = @created_by
  )
`);

for (const group of sampleGroups) {
  insertGroup.run(group);
}

console.log(`Seeded ${sampleStudents.length} sample student account(s).`);
console.log('Sample login: ava.ngata@aut.ac.nz / Password123!');
console.log(`Seeded ${sampleGroups.length} sample study group(s).`);

db.close();
