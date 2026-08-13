import db from '../db/index.js';
import { findById, updateStudent, toPublicProfile } from '../models/studentModel.js';
import { isNonEmptyString } from '../utils/validate.js';

// FR-02 / AC-04: an authenticated user can view their own profile.
export function getProfile(req, res) {
  const student = findById(db, req.studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }
  return res.status(200).json({ student: toPublicProfile(student) });
}

// FR-02 / AC-05 / AC-06: an authenticated user can modify supported editable
// profile fields, and valid changes are saved and returned.
export function updateProfile(req, res) {
  const { first_name, last_name, course, bio } = req.body ?? {};
  const fields = {};
  const errors = [];

  if (first_name !== undefined) {
    if (!isNonEmptyString(first_name, { max: 100 })) errors.push('first_name must not be empty.');
    else fields.first_name = first_name.trim();
  }
  if (last_name !== undefined) {
    if (!isNonEmptyString(last_name, { max: 100 })) errors.push('last_name must not be empty.');
    else fields.last_name = last_name.trim();
  }
  if (course !== undefined) {
    if (course !== null && !isNonEmptyString(course, { max: 50 })) errors.push('course must be a short string or null.');
    else fields.course = course === null ? null : course.trim();
  }
  if (bio !== undefined) {
    if (bio !== null && typeof bio !== 'string') errors.push('bio must be a string or null.');
    else fields.bio = bio === null ? null : bio.trim();
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Invalid profile update.', details: errors });
  }

  const student = updateStudent(db, req.studentId, fields);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  return res.status(200).json({ student: toPublicProfile(student) });
}
