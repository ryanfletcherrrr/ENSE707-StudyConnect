import { loadEnv } from './utils/env.js';
loadEnv();

import { createApp } from './app.js';

const server = createApp();
const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(`StudyConnect backend listening on http://localhost:${port}`);
});
