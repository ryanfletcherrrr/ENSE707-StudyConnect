// A small set of helpers that stand in for Express (req.body, res.status().json(),
// route matching, CORS) using only Node's built-in "http" module. This project
// has no external dependencies (see README.md), so this file is intentionally
// small and readable rather than a general-purpose framework.

const MAX_BODY_BYTES = 1_000_000; // 1MB is generous for this prototype's JSON payloads

// DEF-01 fix: an oversized body used to call req.destroy() as soon as the
// limit was crossed, which resets the underlying TCP connection - the
// client sees a bare connection reset instead of the 413 response below.
// Instead, once the limit is crossed we stop buffering (so memory is still
// bounded) but let the stream drain normally to its 'end' event, so the
// connection stays alive long enough for app.js to send a clean 413.
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const method = req.method;
    if (method === 'GET') {
      resolve({});
      return;
    }

    const chunks = [];
    let totalBytes = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      if (tooLarge) {
        // Already over the limit - discard further chunks instead of
        // buffering them, but keep the stream flowing so it reaches 'end'.
        return;
      }

      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0; // release what we'd buffered so far
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        return;
      }

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
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const routeParts = route.path.split('/');
    const pathParts = pathname.split('/');

    if (routeParts.length !== pathParts.length) {
      continue;
    }

    const params = {};
    let matches = true;

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith('{') && routePart.endsWith('}')) {
        const paramName = routePart.slice(1, -1);
        params[paramName] = pathPart;
      } else if (routePart !== pathPart) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return {
        ...route,
        params,
      };
    }
  }

  return null;
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
