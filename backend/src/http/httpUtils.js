// A small set of helpers that stand in for Express (req.body, res.status().json(),
// route matching, CORS) using only Node's built-in "http" module. This project
// has no external dependencies (see README.md), so this file is intentionally
// small and readable rather than a general-purpose framework.

const MAX_BODY_BYTES = 1_000_000; // 1MB is generous for this prototype's JSON payloads

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const method = req.method;
    if (method === 'GET' || method === 'DELETE') {
      resolve({});
      return;
    }

    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });

    req.on('error', reject);
  });
}

// Adds Express-style res.status(code) and res.json(body) helpers onto
// Node's raw ServerResponse object.
export function enhanceResponse(res) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };
  res.json = function json(body) {
    const payload = JSON.stringify(body);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(payload);
    return res;
  };
  return res;
}

export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function findRoute(routes, method, pathname) {
  return routes.find((route) => route.method === method && route.path === pathname) || null;
}

// Runs an array of (req, res, next) handlers in sequence, matching Express's
// middleware chain behaviour. A handler stops the chain by not calling
// next(), typically because it already sent a response.
export async function runHandlerChain(handlers, req, res) {
  let index = 0;

  async function next(err) {
    if (err) {
      throw err;
    }
    const handler = handlers[index++];
    if (!handler) return;
    await handler(req, res, next);
  }

  await next();
}
