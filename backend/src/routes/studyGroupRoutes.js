import { requireAuth } from '../middleware/auth.js';

import {
  createGroup,
  getMyGroups,
  searchStudyGroups,
  joinGroup,
  getStudyGroupSlots,
  leaveGroup,
  shareLearningResource,
  getLearningResources,
} from '../controllers/studyGroupController.js';

import {
  getChatMessages,
  sendChatMessage,
  getChatMembers,
} from '../controllers/groupChatController.js';

// FR-NEW: authenticated students can create a study group.
// FR-NEW: authenticated students can list the study groups they belong to.
// FR-03: authenticated students can search for study groups by course.
// FR-04: authenticated students can join a study group.
export default [
  {
    method: 'POST',
    path: '/api/study-groups',
    handlers: [requireAuth, createGroup],
  },

  {
    method: 'GET',
    path: '/api/study-groups/mine',
    handlers: [requireAuth, getMyGroups],
  },

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

  {
    method: 'DELETE',
    path: '/api/study-groups/leave',
    handlers: [requireAuth, leaveGroup],
  },

  {
    method: 'POST',
    path: '/api/study-groups/{id}/resources',
    handlers: [requireAuth, shareLearningResource],
  },
  
  {
    method: 'GET',
    path: '/api/study-groups/{id}/resources',
    handlers: [requireAuth, getLearningResources],
  },

  {
    method: 'GET',
    path: '/api/chat/slots/{id}/messages',
    handlers: [requireAuth, getChatMessages],
  },

  {
    method: 'POST',
    path: '/api/chat/slots/{id}/messages',
    handlers: [requireAuth, sendChatMessage],
  },

  {
    method: 'GET',
    path: '/api/chat/slots/{id}/members',
    handlers: [requireAuth, getChatMembers],
  },

];