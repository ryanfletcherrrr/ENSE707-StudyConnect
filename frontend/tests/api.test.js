// Tests the api.js request/response handling logic with a stubbed
// fetch and a minimal in-memory localStorage polyfill (Node itself has no
// localStorage global - see README.md for why the project has no jsdom
// dependency to provide one).
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

const { api, getToken, setToken, clearToken } = await import('../public/js/api.js');

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

test('token storage: set/get/clear round-trip', () => {
  clearToken();
  assert.equal(getToken(), null);
  setToken('abc.def.ghi');
  assert.equal(getToken(), 'abc.def.ghi');
  clearToken();
  assert.equal(getToken(), null);
});

test('api.login: sends credentials and returns the parsed response on success', async () => {
  const stub = stubFetch((url) => {
    assert.ok(url.endsWith('/auth/login'));
    return jsonResponse(200, { token: 'a.b.c', student: { id: 1, email: 'ava@aut.ac.nz' } });
  });

  const data = await api.login('ava@aut.ac.nz', 'Password123!');
  assert.equal(data.token, 'a.b.c');

  const sentBody = JSON.parse(stub.calls[0].options.body);
  assert.equal(sentBody.email, 'ava@aut.ac.nz');
  assert.equal(sentBody.password, 'Password123!');

  stub.restore();
});

// AC-02 support: a rejected login should surface the backend's error message.
test('api.login: throws with the backend error message on invalid credentials', async () => {
  const stub = stubFetch(() => jsonResponse(401, { error: 'Incorrect email or password.' }));

  await assert.rejects(
    () => api.login('ava@aut.ac.nz', 'wrong'),
    (err) => {
      assert.equal(err.message, 'Incorrect email or password.');
      assert.equal(err.status, 401);
      return true;
    }
  );

  stub.restore();
});

test('api.getProfile: attaches the stored token as a Bearer header', async () => {
  setToken('my-test-token');
  const stub = stubFetch((url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer my-test-token');
    return jsonResponse(200, { student: { id: 1, first_name: 'Ava' } });
  });

  const data = await api.getProfile();
  assert.equal(data.student.first_name, 'Ava');

  stub.restore();
  clearToken();
});

test('api.getProfile: throws immediately (no network call) when there is no token', async () => {
  clearToken();
  const stub = stubFetch(() => {
    throw new Error('fetch should not have been called');
  });

  await assert.rejects(() => api.getProfile(), /Not authenticated/);
  assert.equal(stub.calls.length, 0);

  stub.restore();
});

// AC-06 support: a successful profile update returns the saved student data.
test('api.updateProfile: sends a PUT with the updated fields', async () => {
  setToken('my-test-token');
  const stub = stubFetch((url, options) => {
    assert.ok(url.endsWith('/profile/me'));
    assert.equal(options.method, 'PUT');
    return jsonResponse(200, { student: { id: 1, bio: 'Updated bio.' } });
  });

  const data = await api.updateProfile({ bio: 'Updated bio.' });
  assert.equal(data.student.bio, 'Updated bio.');

  stub.restore();
  clearToken();
});

test('api client: surfaces a friendly error when the network request itself fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError('network down');
  };

  await assert.rejects(() => api.login('ava@aut.ac.nz', 'Password123!'), /Could not reach the StudyConnect server/);

  globalThis.fetch = originalFetch;
});
