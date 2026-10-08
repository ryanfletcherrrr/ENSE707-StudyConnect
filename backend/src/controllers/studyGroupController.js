import db from '../db/index.js';

import {
  createStudyGroup,
  findGroupsByCourse,
  findGroupsForStudent,
  joinStudyGroup,
  findStudyGroupSlots,
  leaveStudyGroup,
} from '../models/studyGroupModel.js';
import { isNonEmptyString } from '../utils/validate.js';

const MIN_GROUP_CAPACITY = 2;
const MAX_GROUP_CAPACITY = 20;
const DEFAULT_GROUP_CAPACITY = 6; // matches the seeded groups' capacity

// FR-NEW: an authenticated student can create a study group. They are
// automatically enrolled as its first member (see createStudyGroup).
export function createGroup(req, res) {
  const { group_name, course, description, capacity } = req.body ?? {};

  const errors = [];

  if (!isNonEmptyString(group_name, { max: 150 })) {
    errors.push('group_name is required and must be 150 characters or fewer.');
  }

  let normalizedCourse;
  if (!isNonEmptyString(course, { max: 20 })) {
    errors.push('course is required and must be 20 characters or fewer.');
  } else {
    normalizedCourse = course.trim().toUpperCase();
  }

  if (!isNonEmptyString(description, { max: 1000 })) {
    errors.push('description is required and must be 1000 characters or fewer.');
  }

  const parsedCapacity = capacity === undefined ? DEFAULT_GROUP_CAPACITY : Number(capacity);
  if (
    !Number.isInteger(parsedCapacity) ||
    parsedCapacity < MIN_GROUP_CAPACITY ||
    parsedCapacity > MAX_GROUP_CAPACITY
  ) {
    errors.push(`capacity must be a whole number between ${MIN_GROUP_CAPACITY} and ${MAX_GROUP_CAPACITY}.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Invalid study group details.', details: errors });
  }

  const group = createStudyGroup(db, {
    groupName: group_name.trim(),
    course: normalizedCourse,
    description: description.trim(),
    capacity: parsedCapacity,
    createdBy: req.studentId,
  });

  return res.status(201).json({
    message: `"${group.groupName}" was created - you've been added as its first member.`,
    group,
  });
}

// FR-NEW (my groups): an authenticated student can list the study groups
// they have joined (or created), most recently joined first.
export function getMyGroups(req, res) {
  const groups = findGroupsForStudent(db, req.studentId);
  return res.status(200).json({ groups });
}

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

// ER-04: an authenticated student can join a study group.
export function joinGroup(req, res) {
  const slotId = Number(req.body?.slotId);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return res.status(400).json({
      error: 'A valid study group is required.',
    });
  }

  try {
    const result = joinStudyGroup(
      db,
      slotId,
      req.studentId
    );

    return res.status(200).json({
      message: `Successfully joined Group ${result.groupNumber}.`,
      group: result,
    });
  } catch (err) {
    const status = err.status || 500;

    return res.status(status).json({
      error: err.message || 'Could not join the study group.',
    });
  }
}

export function leaveGroup(req, res) {
  const slotId = Number(req.body?.slotId);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return res.status(400).json({
      error: 'A valid study group is required.',
    });
  }

  try {
    leaveStudyGroup(
      db,
      slotId,
      req.studentId
    );

    return res.status(200).json({
      message: 'Successfully left the study group.',
    });
  } catch (err) {
    const status = err.status || 500;

    return res.status(status).json({
      error: err.message || 'Could not leave the study group.',
    });
  }
}

export function getStudyGroupSlots(req, res) {
  const studyGroupId = Number(req.params.id);

  if (!Number.isInteger(studyGroupId) || studyGroupId <= 0) {
    return res.status(400).json({
      error: 'A valid study group ID is required.',
    });
  }

  try {
    const slots = findStudyGroupSlots(db, studyGroupId);

    return res.status(200).json({
      slots,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Could not get study group slots.',
    });
  }
}