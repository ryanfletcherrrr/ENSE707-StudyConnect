import { api, getToken, clearToken } from './api.js';
import { formatMemberCount, buildStudyGroupHref } from './myGroups.js';

const headingEl = document.getElementById('welcome-heading');
const subtitleEl = document.getElementById('welcome-subtitle');
const logoutBtn = document.getElementById('logout-btn');
const myGroupsMessageEl = document.getElementById('my-groups-message');
const myGroupsListEl = document.getElementById('my-groups-list');

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

async function loadMyGroups() {
  try {
    const { groups } = await api.getMyStudyGroups();

    if (!groups || groups.length === 0) {
      myGroupsMessageEl.textContent =
        "You haven't joined any study groups yet. Find one or create your own from the links above.";
      return;
    }

    myGroupsMessageEl.textContent = `You are in ${groups.length} study group${groups.length === 1 ? '' : 's'}.`;

    for (const group of groups) {
      const item = document.createElement('div');
      item.className = 'my-group';

      const link = document.createElement('a');
      link.href = buildStudyGroupHref(group);
      link.textContent = group.group_name;

      const meta = document.createElement('p');
      meta.className = 'my-group__meta';
      meta.textContent = `${group.course} · Group ${group.group_number} · ${formatMemberCount(group)}`;

      item.appendChild(link);
      item.appendChild(meta);
      myGroupsListEl.appendChild(item);
    }
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }
    myGroupsMessageEl.textContent = err.message || 'Could not load your study groups.';
  }
}

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

init();
loadMyGroups();
