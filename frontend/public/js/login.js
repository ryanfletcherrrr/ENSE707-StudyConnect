import { api, setToken } from './api.js';
import { validateLoginForm } from './validate.js';
import { showMessage, hideMessage, applyFieldErrors } from './ui.js';

const form = document.getElementById('login-form');
const messageEl = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage(messageEl);

  const email = form.email.value;
  const password = form.password.value;

  const errors = validateLoginForm({ email, password });
  applyFieldErrors(form, errors);
  if (Object.keys(errors).length > 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const { token } = await api.login(email, password);
    setToken(token);
    window.location.href = 'dashboard.html';
  } catch (err) {
    // AC-02: invalid credentials show a clear, generic error message.
    showMessage(messageEl, err.message || 'Sign in failed. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
  }
});
