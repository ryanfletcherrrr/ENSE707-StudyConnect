// Small shared DOM helpers used by the page controllers.

export function showMessage(el, text, type = 'error') {
  el.textContent = text;
  el.classList.remove('error', 'success');
  el.classList.add('visible', type);
}

export function hideMessage(el) {
  el.textContent = '';
  el.classList.remove('visible', 'error', 'success');
}

export function setFieldError(form, fieldName, message) {
  const el = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (el) el.textContent = message || '';
}

export function clearFieldErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = '';
  });
}

export function applyFieldErrors(form, errors) {
  clearFieldErrors(form);
  Object.entries(errors).forEach(([field, message]) => setFieldError(form, field, message));
}
