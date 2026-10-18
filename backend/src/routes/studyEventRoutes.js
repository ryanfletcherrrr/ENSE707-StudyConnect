import { requireAuth } from '../middleware/auth.js';

import {
  getMyStudyEvents,
  getStudyEvent,
  createStudyEventHandler,
  updateStudyEventHandler,
  cancelStudyEventHandler,
} from '../controllers/studyEventController.js';

export default [
  {
    method: 'GET',
    path: '/api/study-events',
    handlers: [requireAuth, getMyStudyEvents],
  },
  {
    method: 'GET',
    path: '/api/study-events/{id}',
    handlers: [requireAuth, getStudyEvent],
  },
  {
    method: 'POST',
    path: '/api/study-events',
    handlers: [requireAuth, createStudyEventHandler],
  },
  {
    method: 'PATCH',
    path: '/api/study-events/{id}',
    handlers: [requireAuth, updateStudyEventHandler],
  },
  {
    method: 'DELETE',
    path: '/api/study-events/{id}',
    handlers: [requireAuth, cancelStudyEventHandler],
  },
];
