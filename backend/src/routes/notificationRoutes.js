import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  getNotification,
  markAsRead,
} from '../controllers/notificationController.js';

export default [
  {
    method: 'GET',
    path: '/api/notifications',
    handlers: [requireAuth, getNotifications],
  },
  {
    method: 'GET',
    path: '/api/notifications/{id}',
    handlers: [requireAuth, getNotification],
  },
  {
    method: 'PATCH',
    path: '/api/notifications/{id}/read',
    handlers: [requireAuth, markAsRead],
  },
];