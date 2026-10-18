import db from '../db/index.js';

import {
    createStudyEvent,
    findStudyEventById,
    findStudyEventsForStudent,
    findStudyEventParticipants,
    findStudyGroupById,
    findStudentsInStudyGroupByIds,
    updateStudyEvent,
    cancelStudyEvent,
    isStudentInStudyGroup,
    isStudentInvitedToEvent,
    isStudentEventCreator,
} from '../models/studyEventModel.js';

import { isNonEmptyString } from '../utils/validate.js';

function parseEventId(value) {
    const eventId = Number(value);
    return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
}

function parseDateTime(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function validateEventDetails(body) {
    const {
        title,
        description,
        start_time,
        end_time,
        location,
    } = body ?? {};

    const errors = [];

    if (!isNonEmptyString(title, { max: 200 })) {
        errors.push('Title is required and must be 200 characters or fewer.');
    }

    if (
        description !== undefined &&
        description !== null &&
        description !== '' &&
        !isNonEmptyString(description, { max: 1000 })
    ) {
        errors.push('Description must be 1000 characters or fewer.');
    }

    if (
        location !== undefined &&
        location !== null &&
        location !== '' &&
        !isNonEmptyString(location, { max: 500 })
    ) {
        errors.push('Location must be 500 characters or fewer.');
    }

    const startDate = parseDateTime(start_time);
    const endDate = parseDateTime(end_time);

    if (!startDate) {
        errors.push('A valid start_time is required.');
    }

    if (!endDate) {
        errors.push('A valid end_time is required.');
    }

    if (startDate && endDate && endDate <= startDate) {
        errors.push('End time must be after start time.');
    }

    return {
        errors,
        values: {
            title: typeof title === 'string' ? title.trim() : '',
            description:
                typeof description === 'string' && description.trim()
                    ? description.trim()
                    : null,
            startTime: startDate ? startDate.toISOString() : null,
            endTime: endDate ? endDate.toISOString() : null,
            location:
                typeof location === 'string' && location.trim()
                    ? location.trim()
                    : null,
        },
    };
}

function getStudentEventAccess(eventId, studentId, res) {
    const event = findStudyEventById(db, eventId);

    if (!event) {
        res.status(404).json({ error: 'Study event not found.' });
        return null;
    }

    const isCreator = isStudentEventCreator(db, eventId, studentId);
    const isInvited = isStudentInvitedToEvent(db, eventId, studentId);

    if (!isCreator && !isInvited) {
        res.status(403).json({
            error: 'You must be the event creator or an invited participant to access this event.',
        });
        return null;
    }

    return event;
}

export function getMyStudyEvents(req, res) {
    const events = findStudyEventsForStudent(db, req.studentId);

    return res.status(200).json({ events });
}

export function getStudyEvent(req, res) {
    const eventId = parseEventId(req.params.id);

    if (!eventId) {
        return res.status(400).json({
            error: 'A valid study event ID is required.',
        });
    }

    const event = getStudentEventAccess(eventId, req.studentId, res);

    if (!event) {
        return;
    }

    const participants = findStudyEventParticipants(db, eventId);

    return res.status(200).json({
        event,
        participants,
    });
}

export function createStudyEventHandler(req, res) {
    const studyGroupId = Number(req.body?.study_group_id);
    const inviteeIds = req.body?.invitee_ids ?? [];

    if (!Number.isInteger(studyGroupId) || studyGroupId <= 0) {
        return res.status(400).json({
            error: 'A valid study group ID is required.',
        });
    }

    if (
        !Array.isArray(inviteeIds) ||
        !inviteeIds.every(
            (id) => Number.isInteger(id) && id > 0,
        )
    ) {
        return res.status(400).json({
            error: 'invitee_ids must be an array of valid student IDs.',
        });
    }

    const uniqueInviteeIds = [...new Set(inviteeIds)];

    const studyGroup = findStudyGroupById(db, studyGroupId);

    if (!studyGroup) {
        return res.status(404).json({
            error: 'Study group not found.',
        });
    }

    if (!isStudentInStudyGroup(db, studyGroupId, req.studentId)) {
        return res.status(403).json({
            error: 'You must be a member of this study group to create an event.',
        });
    }

    const { errors, values } = validateEventDetails(req.body);

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Invalid study event details.',
            details: errors,
        });
    }

    const validInvitees = findStudentsInStudyGroupByIds(
        db,
        studyGroupId,
        uniqueInviteeIds,
    );

    if (validInvitees.length !== uniqueInviteeIds.length) {
        return res.status(400).json({
            error: 'All invitees must be registered students who belong to the selected study group.',
        });
    }

    const event = createStudyEvent(db, {
        studyGroupId,
        ...values,
        createdBy: req.studentId,
        inviteeIds: uniqueInviteeIds,
    });

    return res.status(201).json({
        message: 'Study event created successfully.',
        event,
    });
}

export function updateStudyEventHandler(req, res) {
    const eventId = parseEventId(req.params.id);

    if (!eventId) {
        return res.status(400).json({
            error: 'A valid study event ID is required.',
        });
    }

    const event = findStudyEventById(db, eventId);

    if (!event) {
        return res.status(404).json({
            error: 'Study event not found.',
        });
    }

    if (!isStudentEventCreator(db, eventId, req.studentId)) {
        return res.status(403).json({
            error: 'Only the event creator can edit this event.',
        });
    }

    if (event.status !== 'scheduled') {
        return res.status(409).json({
            error: 'Cancelled events cannot be edited.',
        });
    }

    const { errors, values } = validateEventDetails(req.body);

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Invalid study event details.',
            details: errors,
        });
    }

    const updatedEvent = updateStudyEvent(db, {
        eventId,
        ...values,
    });

    return res.status(200).json({
        message: 'Study event updated successfully.',
        event: updatedEvent,
    });
}

export function cancelStudyEventHandler(req, res) {
    const eventId = parseEventId(req.params.id);

    if (!eventId) {
        return res.status(400).json({
            error: 'A valid study event ID is required.',
        });
    }

    const event = findStudyEventById(db, eventId);

    if (!event) {
        return res.status(404).json({
            error: 'Study event not found.',
        });
    }

    if (!isStudentEventCreator(db, eventId, req.studentId)) {
        return res.status(403).json({
            error: 'Only the event creator can cancel this event.',
        });
    }

    if (event.status === 'cancelled') {
        return res.status(409).json({
            error: 'This study event has already been cancelled.',
        });
    }

    const cancelledEvent = cancelStudyEvent(db, eventId);

    return res.status(200).json({
        message: 'Study event cancelled successfully.',
        event: cancelledEvent,
    });
}
