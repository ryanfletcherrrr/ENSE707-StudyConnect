import { api, getToken, clearToken } from './api.js';
import { validateCreateGroupForm } from './validate.js';
import { showMessage, hideMessage, applyFieldErrors } from './ui.js';

const form = document.getElementById('create-group-form');
const messageEl = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');
const logoutBtn = document.getElementById('logout-btn');

if (!getToken()) {
  window.location.href = 'index.html';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage(messageEl);

  const fields = {
    group_name: form.group_name.value,
    course: form.course.value,
    description: form.description.value,
    capacity: form.capacity.value,
  };

  const errors = validateCreateGroupForm(fields);
  applyFieldErrors(form, errors);
  if (Object.keys(errors).length > 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating group…';

  try {
    // Only send capacity if the student actually entered one - let the
    // backend apply its own default (6) rather than duplicating it here.
    const payload = {
      group_name: fields.group_name,
      course: fields.course,
      description: fields.description,
    };
    if (fields.capacity !== '') {
      payload.capacity = Number(fields.capacity);
    }

    const { group } = await api.createStudyGroup(payload);

    window.location.href = `study-group.html?id=${group.id}&slotId=${group.slotId}`;
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }

    showMessage(messageEl, err.message || 'Could not create the study group. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create group';
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});
