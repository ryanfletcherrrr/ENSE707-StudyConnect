import { login, register } from '../controllers/authController.js';

// FR-01: registered students can log in with valid credentials.
// Workflow 4: account creation, so there is a way to get a student into the
// system before login can be exercised end-to-end.
export default [
  { method: 'POST', path: '/api/auth/login', handlers: [login] },
  { method: 'POST', path: '/api/auth/register', handlers: [register] },
];
