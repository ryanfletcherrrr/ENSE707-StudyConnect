// Spins up the real StudyConnect app on an ephemeral port, backed by an
// in-memory SQLite database, so the auth/profile tests exercise the actual
// HTTP layer (routing, JSON parsing, middleware) using Node's built-in
// fetch - the same role "supertest" would normally play, without adding a
// dependency. Node's test runner isolates each test *file* in its own
// process, so setting these env vars here does not leak between files.
import { once } from 'node:events';

export async function startTestServer() {
  process.env.DB_FILE = ':memory:';
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
  process.env.JWT_EXPIRES_IN = '1h';

  const { createApp } = await import('../../app.js');
  const server = createApp();
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  return {
    baseUrl: `http://localhost:${port}/api`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
