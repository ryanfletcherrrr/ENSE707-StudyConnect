import db from '../db/index.js';
import { findByEmail, createStudent, toPublicProfile } from '../models/studentModel.js';
import { isValidEmail, isNonEmptyString, isValidPassword, isValidBio, MAX_BIO_LENGTH } from '../utils/validate.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken as signJwt } from '../utils/token.js';

function signToken(student) {
  return signJwt(
    { sub: student.id, email: student.email },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

// FR-01 / AC-01 / AC-02: authenticate a registered student with valid
// credentials, or reject with a clear error otherwise.
export function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'A valid email and password are required.' });
  }

  const student = findByEmail(db, email);
  if (!student) {
    // Same generic message as a wrong password, so we don't leak which
    // emails are registered.
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const passwordMatches = verifyPassword(password, student.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(student);
  return res.status(200).json({
    token,
    student: toPublicProfile(student),
  });
}

// Supports account creation (Workflow 4) so there's a way to get a student
// into the system before FR-01 login can be tested end-to-end.
export function register(req, res) {
  const { first_name, last_name, email, password, course, bio } = req.body ?? {};

  const errors = [];
  if (!isNonEmptyString(first_name, { max: 100 })) errors.push('first_name is required.');
  if (!isNonEmptyString(last_name, { max: 100 })) errors.push('last_name is required.');
  if (!isValidEmail(email)) errors.push('A valid email is required.');

  // DEF-05: a non-string password used to produce the same message as a
  // too-short one ("must be at least 8 characters"), which is misleading
  // when the real problem is a type-confusion input (e.g. password: 123).
  if (typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  } else if (!isValidPassword(password)) {
    errors.push('Password must be between 8 and 128 characters.');
  }

  // DEF-02: same unbounded-bio issue as profile update - registration also
  // accepts a bio field, so it needs the same cap.
  if (!isValidBio(bio)) errors.push(`bio must be a string of ${MAX_BIO_LENGTH} characters or fewer, or null.`);

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Invalid registration details.', details: errors });
  }

  if (findByEmail(db, email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const password_hash = hashPassword(password);
  const student = createStudent(db, {
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    email,
    password_hash,
    course: course?.trim() || null,
    bio: bio?.trim() || null,
  });

  const token = signToken(student);
  return res.status(201).json({
    token,
    student: toPublicProfile(student),
  });
}
