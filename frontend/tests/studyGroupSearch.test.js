import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #store = new Map();

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }

  setItem(key, value) {
    this.#store.set(key, String(value));
  }

  removeItem(key) {
    this.#store.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage();

const { api, setToken, clearToken } = await import('../public/js/api.js');

function stubFetch(responseFactory) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return responseFactory(url, options);
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('course search API sends encoded course and authentication token', async () => {
  setToken('course-search-token');

  const stub = stubFetch((url, options) => {
    assert.ok(url.endsWith('/study-groups?course=ENSE707'));
    assert.equal(options.headers.Authorization, 'Bearer course-search-token');

    return jsonResponse(200, {
      groups: [
        {
          id: 1,
          group_name: 'ENSE707 Study Group',
          course: 'ENSE707',
        },
      ],
    });
  });

  const data = await api.searchStudyGroups('ENSE707');

  assert.equal(data.groups.length, 1);
  assert.equal(data.groups[0].course, 'ENSE707');

  stub.restore();
  clearToken();
});

test('course search API safely encodes spaces and special characters', async () => {
  setToken('course-search-token');

  const stub = stubFetch((url) => {
    assert.ok(url.endsWith('/study-groups?course=ENSE707%20%26%20SQA'));

    return jsonResponse(200, { groups: [] });
  });

  const data = await api.searchStudyGroups('ENSE707 & SQA');

  assert.deepEqual(data.groups, []);

  stub.restore();
  clearToken();
});

test('course search API surfaces backend validation errors', async () => {
  setToken('course-search-token');

  const stub = stubFetch(() =>
    jsonResponse(400, {
      error: 'Course must be 20 characters or fewer.',
    })
  );

  await assert.rejects(
    () => api.searchStudyGroups('THIS-COURSE-NAME-IS-TOO-LONG'),
    /Course must be 20 characters or fewer./
  );

  stub.restore();
  clearToken();
});