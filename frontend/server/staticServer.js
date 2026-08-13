// Tiny static file server for the frontend's public/ folder. Written by
// hand using only Node's built-in "http" and "fs" modules so the frontend
// needs zero external dependencies (no Vite dev server available in this
// environment - see README.md). Swapping this out for `npm create vite` /
// `vite dev` later does not require any changes to the HTML/CSS/JS files
// themselves.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const port = process.env.PORT || 5500;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const resolved = path.normalize(path.join(base, decoded));
  if (!resolved.startsWith(base)) {
    return null; // path traversal attempt
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  let filePath = safeJoin(publicDir, req.url === '/' ? '/index.html' : req.url);

  if (!filePath) {
    res.writeHead(400);
    res.end('Bad request.');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fall back to index.html for unknown paths only if it looks like a
      // client route without an extension; otherwise return a real 404.
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found.');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`StudyConnect frontend listening on http://localhost:${port}`);
});
