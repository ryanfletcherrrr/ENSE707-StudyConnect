import { requireAuth } from '../middleware/auth.js';
import { searchStudyGroups } from '../controllers/studyGroupController.js';

// FR-03: authenticated students can search for study groups by course.
export default [
  {
    method: 'GET',
    path: '/api/study-groups',
    handlers: [requireAuth, searchStudyGroups],
  },
];