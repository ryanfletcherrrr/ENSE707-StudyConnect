import { api, getToken, clearToken } from './api.js';

const titleEl = document.getElementById('group-title');
const descriptionEl = document.getElementById('group-description');
const messageEl = document.getElementById('group-message');
const slotsEl = document.getElementById('group-slots');
const logoutBtn = document.getElementById('logout-btn');

if (!getToken()) {
  window.location.href = 'index.html';
}

const params = new URLSearchParams(window.location.search);
const studyGroupId = Number(params.get('id'));

if (!Number.isInteger(studyGroupId) || studyGroupId <= 0) {
  messageEl.textContent = 'Invalid study group.';
} else {
  loadStudyGroup();
}

async function loadStudyGroup() {
  try {
    const { slots } = await api.getStudyGroupSlots(studyGroupId);

    if (!slots || slots.length === 0) {
      messageEl.textContent = 'No study groups are currently available.';
      return;
    }

    titleEl.textContent = 'Choose a Study Group';

    renderSlots(slots);
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }

    messageEl.textContent =
      err.message || 'Could not load study groups.';
  }
}

function renderSlots(slots) {
  slotsEl.innerHTML = '';

  for (const slot of slots) {
    const slotCard = document.createElement('div');
    slotCard.className = 'card';

    const heading = document.createElement('h2');
    heading.textContent = `Group ${slot.group_number}`;

    const members = document.createElement('p');
    members.textContent =
      `Members: ${slot.member_count} / ${slot.capacity}`;

    const button = document.createElement('button');
    button.type = 'button';

    if (slot.member_count >= slot.capacity) {
      button.textContent = 'Full';
      button.disabled = true;
    } else {
      button.textContent = 'Join Group';

      button.addEventListener('click', () => {
        joinGroup(slot.id, button);
      });
    }

    slotCard.appendChild(heading);
    slotCard.appendChild(members);
    slotCard.appendChild(button);

    slotsEl.appendChild(slotCard);
  }
}

async function joinGroup(slotId, button) {
  button.disabled = true;
  messageEl.textContent = '';

  try {
    const result = await api.joinStudyGroup(slotId);

    messageEl.textContent = result.message;

    await loadStudyGroup();
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }

    messageEl.textContent =
      err.message || 'Could not join the study group.';

    button.disabled = false;
  }
}

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});