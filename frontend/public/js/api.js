// Thin fetch wrapper for the StudyConnect backend API, plus session-token
// storage. Session persistence uses localStorage deliberately here (this is
// a real deployed webapp running in the user's own browser, not a
// Claude.ai artifact preview) so a page refresh doesn't log the student out.
import { API_BASE_URL } from './config.js';

const TOKEN_KEY = 'studyconnect_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (!token) {
      const err = new Error('Not authenticated.');
      err.status = 401;
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    const err = new Error('Could not reach the StudyConnect server. Is the backend running?');
    err.cause = networkErr;
    throw err;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body; leave data as null.
  }

  if (!response.ok) {
    const message = (data && data.error) || `Request failed (${response.status}).`;
    const err = new Error(message);
    err.status = response.status;
    err.details = data && data.details;
    throw err;
  }

  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (fields) => request('/auth/register', { method: 'POST', body: fields }),
  getProfile: () => request('/profile/me', { auth: true }),
  updateProfile: (fields) => request('/profile/me', { method: 'PUT', body: fields, auth: true }),
  searchStudyGroups: (course) =>
    request(`/study-groups?course=${encodeURIComponent(course)}`, {
      auth: true,
    }),
  getStudyGroupSlots: (studyGroupId) =>
    request(`/study-groups/${studyGroupId}/slots`, {
      auth: true,
    }),
  joinStudyGroup: (slotId) =>
    request('/study-groups/join', {
      method: 'POST',
      body: { slotId },
      auth: true,
    }),
};
