import db from '../db/index.js';

import {
  findGroupsByCourse,
  joinStudyGroup,
  findStudyGroupSlots,
  leaveStudyGroup,
} from '../models/studyGroupModel.js';

// FR-03: an authenticated student can search for study groups by course.
export function searchStudyGroups(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const course = url.searchParams.get('course');

  if (!course || typeof course !== 'string' || !course.trim()) {
    return res.status(400).json({
      error: 'Course is required.'
    });
  }

  const groups = findGroupsByCourse(db, course);

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