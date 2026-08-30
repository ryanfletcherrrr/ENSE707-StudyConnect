import { api, getToken, clearToken } from './api.js';

const form = document.getElementById('course-search-form');
const courseInput = document.getElementById('course');
const messageEl = document.getElementById('search-message');
const resultsEl = document.getElementById('group-results');
const logoutBtn = document.getElementById('logout-btn');

if (!getToken()) {
  window.location.href = 'index.html';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const course = courseInput.value.trim();

  messageEl.textContent = '';
  resultsEl.innerHTML = '';

  if (!course) {
    messageEl.textContent = 'Please enter a course.';
    return;
  }

  try {
    const { groups } = await api.searchStudyGroups(course);

    if (!groups || groups.length === 0) {
      messageEl.textContent = 'No matching study groups were found.';
      return;
    }

    for (const group of groups) {
      const groupCard = document.createElement('div');
      groupCard.className = 'card';

      const heading = document.createElement('h2');
      heading.textContent = group.group_name;

      const courseText = document.createElement('p');
      courseText.textContent = `Course: ${group.course}`;

      const description = document.createElement('p');
      description.textContent = group.description;

      // Button to view the available groups
      const viewGroupsBtn = document.createElement('button');
      viewGroupsBtn.type = 'button';
      viewGroupsBtn.textContent = 'View Groups';

      viewGroupsBtn.addEventListener('click', () => {
        window.location.href = `join-group.html?id=${group.id}`;
      });

      groupCard.appendChild(heading);
      groupCard.appendChild(courseText);
      groupCard.appendChild(description);
      groupCard.appendChild(viewGroupsBtn);

      resultsEl.appendChild(groupCard);
    }
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }

    messageEl.textContent =
      err.message || 'Could not search for study groups.';
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});