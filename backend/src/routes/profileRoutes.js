import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

// FR-02: authenticated students can view and update their profile.
export default [
  { method: 'GET', path: '/api/profile/me', handlers: [requireAuth, getProfile] },
  { method: 'PUT', path: '/api/profile/me', handlers: [requireAuth, updateProfile] },
];
