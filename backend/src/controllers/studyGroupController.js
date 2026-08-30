import db from '../db/index.js';
import { findGroupsByCourse } from '../models/studyGroupModel.js';

// FR-03: an authenticated student can search for study groups by course.
export function searchStudyGroups(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const course = url.searchParams.get('course');

if (!course || typeof course !== 'string' || !course.trim()) {
  return res.status(400).json({
    error: 'Course is required.'
  });
}

const normalizedCourse = course.trim().toUpperCase();

if (normalizedCourse.length > 20) {
  return res.status(400).json({
    error: 'Course must be 20 characters or fewer.'
  });
}

const groups = findGroupsByCourse(db, normalizedCourse);

  return res.status(200).json({
    groups
  });
}