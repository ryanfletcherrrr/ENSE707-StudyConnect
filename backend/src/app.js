import http from 'node:http';
import { URL } from 'node:url';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import { readJsonBody, enhanceResponse, applyCors, findRoute, runHandlerChain } from './http/httpUtils.js';
import studyGroupRoutes from './routes/studyGroupRoutes.js';

const healthRoute = {
  method: 'GET',
  path: '/api/health',
  handlers: [(req, res) => res.status(200).json({ status: 'ok' })],
};

const routes = [
  healthRoute,
  ...authRoutes,
  ...profileRoutes,
  ...studyGroupRoutes,
];

// Builds a plain Node http.Server (no Express - see README.md for why).
// The req/res objects passed to controllers still look and behave like
// Express's (req.body, res.status().json()), so the controllers themselves
// read the same as they would in an Express app.
export function createApp() {
  return http.createServer(async (req, res) => {
    applyCors(req, res);
    enhanceResponse(res);

    // Preflight requests from the browser for cross-origin PUT/POST calls.
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const route = findRoute(routes, req.method, pathname);

    if (!route) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }

    try {
      req.body = await readJsonBody(req);
      await runHandlerChain(route.handlers, req, res);

      // Defensive fallback: if a handler forgot to send a response.
      if (!res.writableEnded) {
        res.status(500).json({ error: 'Handler did not send a response.' });
      }
    } catch (err) {
      const statusCode = err.statusCode || 500;
      if (statusCode >= 500) {
        console.error(err);
      }
      if (!res.writableEnded) {
        res.status(statusCode).json({
          error: statusCode === 500 ? 'Something went wrong. Please try again.' : err.message,
        });
      }
    }
  });
}
