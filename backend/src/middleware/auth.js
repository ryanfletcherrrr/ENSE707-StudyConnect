import { verifyToken } from '../utils/token.js';

// Protects routes that require an authenticated student (AC-03: a user who
// has not successfully authenticated shall not be able to access functions
// designated as authenticated-only).
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = verifyToken(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.studentId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}
