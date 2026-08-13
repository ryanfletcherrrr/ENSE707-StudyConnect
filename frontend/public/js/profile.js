import { api, getToken, clearToken } from './api.js';
import { validateProfileForm } from './validate.js';
import { showMessage, hideMessage, applyFieldErrors } from './ui.js';

const form = document.getElementById('profile-form');
const messageEl = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');
const loadingEl = document.getElementById('loading-state');
const logoutBtn = document.getElementById('logout-btn');

function fillForm(student) {
  form.email.value = student.email;
  form.first_name.value = student.first_name || '';
  form.last_name.value = student.last_name || '';
  form.course.value = student.course || '';
  form.bio.value = student.bio || '';
}

async function init() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // AC-04: an authenticated user can view their own profile.
    const { student } = await api.getProfile();
    fillForm(student);
    loadingEl.style.display = 'none';
    form.style.display = 'flex';
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }
    loadingEl.textContent = err.message || 'Could not load your profile.';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage(messageEl);

  const fields = {
    first_name: form.first_name.value,
    last_name: form.last_name.value,
    course: form.course.value,
    bio: form.bio.value,
  };

  // AC-05 / AC-11 equivalent for profile edits: invalid input is rejected
  // client-side with clear feedback before it's even sent.
  const errors = validateProfileForm(fields);
  applyFieldErrors(form, errors);
  if (Object.keys(errors).length > 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    // AC-06: valid profile changes are saved and displayed after the
    // update completes.
    const { student } = await api.updateProfile(fields);
    fillForm(student);
    showMessage(messageEl, 'Profile updated.', 'success');
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }
    showMessage(messageEl, err.message || 'Could not save your profile.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save changes';
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

init();
