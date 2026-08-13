import { api, setToken } from './api.js';
import { validateRegisterForm } from './validate.js';
import { showMessage, hideMessage, applyFieldErrors } from './ui.js';

const form = document.getElementById('register-form');
const messageEl = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage(messageEl);

  const fields = {
    first_name: form.first_name.value,
    last_name: form.last_name.value,
    email: form.email.value,
    password: form.password.value,
    course: form.course.value,
  };

  const errors = validateRegisterForm(fields);
  applyFieldErrors(form, errors);
  if (Object.keys(errors).length > 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const { token } = await api.register(fields);
    setToken(token);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showMessage(messageEl, err.message || 'Could not create account. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
