import db from '../db/index.js';

import {
  findChatMessages,
  createChatMessage,
  findChatMembers,
  isStudentInChatSlot,
  findChatSlot,
} from '../models/groupChatModel.js';

import { isNonEmptyString } from '../utils/validate.js';

function getValidSlotId(req, res) {
  const slotId = Number(req.params.id);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    res.status(400).json({
      error: 'A valid group slot ID is required.',
    });
    return null;
  }

  return slotId;
}

function checkChatMembership(slotId, studentId, res) {
  const slot = findChatSlot(db, slotId);

  if (!slot) {
    res.status(404).json({
      error: 'Study group slot not found.',
    });
    return false;
  }

  const membership = isStudentInChatSlot(db, slotId, studentId);

  if (!membership) {
    res.status(403).json({
      error: 'You must be a member of this group to access its chat.',
    });
    return false;
  }

  return true;
}

export function getChatMessages(req, res) {
  const slotId = getValidSlotId(req, res);

  if (slotId === null) {
    return;
  }

  if (!checkChatMembership(slotId, req.studentId, res)) {
    return;
  }

  const messages = findChatMessages(db, slotId);

  return res.status(200).json({ messages });
}

export function sendChatMessage(req, res) {
  const slotId = getValidSlotId(req, res);

  if (slotId === null) {
    return;
  }

  if (!checkChatMembership(slotId, req.studentId, res)) {
    return;
  }

  const { message } = req.body ?? {};

  if (!isNonEmptyString(message, { max: 1000 })) {
    return res.status(400).json({
      error: 'Message is required and must be 1000 characters or fewer.',
    });
  }

  const savedMessage = createChatMessage(db, {
    slotId,
    studentId: req.studentId,
    message: message.trim(),
  });

  return res.status(201).json({
    message: 'Message sent successfully.',
    chatMessage: savedMessage,
  });
}

export function getChatMembers(req, res) {
  const slotId = getValidSlotId(req, res);

  if (slotId === null) {
    return;
  }

  if (!checkChatMembership(slotId, req.studentId, res)) {
    return;
  }

  const members = findChatMembers(db, slotId);

  return res.status(200).json({ members });
}
