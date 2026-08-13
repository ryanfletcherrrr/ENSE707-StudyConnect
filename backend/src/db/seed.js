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

console.log(`Seeded ${sampleStudents.length} sample student account(s).`);
console.log('Sample login: ava.ngata@aut.ac.nz / Password123!');

db.close();
