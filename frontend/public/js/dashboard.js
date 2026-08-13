import { api, getToken, clearToken } from './api.js';

const headingEl = document.getElementById('welcome-heading');
const subtitleEl = document.getElementById('welcome-subtitle');
const logoutBtn = document.getElementById('logout-btn');

async function init() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const { student } = await api.getProfile();
    headingEl.textContent = `Welcome, ${student.first_name}`;
    subtitleEl.textContent = student.course
      ? `Signed in as ${student.email} · ${student.course}`
      : `Signed in as ${student.email}`;
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }
    subtitleEl.textContent = err.message || 'Could not load your account.';
  }
}

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

init();
