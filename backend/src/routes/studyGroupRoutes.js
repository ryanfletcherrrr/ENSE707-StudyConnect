import { requireAuth } from '../middleware/auth.js';

import {
  searchStudyGroups,
  joinGroup,
  getStudyGroupSlots,
} from '../controllers/studyGroupController.js';


// FR-03: authenticated students can search for study groups by course.
// FR-04: authenticated students can join a study group.
export default [
  {
    method: 'GET',
    path: '/api/study-groups',
    handlers: [requireAuth, searchStudyGroups],
  },

  {
    method: 'GET',
    path: '/api/study-groups/{id}/slots',
    handlers: [requireAuth, getStudyGroupSlots],
  },

  {
    method: 'POST',
    path: '/api/study-groups/join',
    handlers: [requireAuth, joinGroup],
  },
];