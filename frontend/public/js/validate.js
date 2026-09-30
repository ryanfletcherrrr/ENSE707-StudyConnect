// Client-side validation helpers, mirroring the rules enforced by the
// backend (backend/src/utils/validate.js). Kept as small, dependency-free,
// pure functions so they're easy to unit test (see tests/validate.test.js)
// and easy to reuse across the login, register, and profile pages.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

export function isNonEmptyString(value, { max = 255 } = {}) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

// DEF-03: mirrors the backend's 128-character cap (backend/src/utils/validate.js)
// so the UI rejects an oversized password before it's ever sent.
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

// Validates the login form. Returns a { fieldName: message } object;
// an empty object means the form is valid.
export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (typeof password !== 'string' || password.length === 0) {
    errors.password = 'Enter your password.';
  }
  return errors;
}

// Validates the registration form.
export function validateRegisterForm({ first_name, last_name, email, password }) {
  const errors = {};
  if (!isNonEmptyString(first_name, { max: 100 })) errors.first_name = 'First name is required.';
  if (!isNonEmptyString(last_name, { max: 100 })) errors.last_name = 'Last name is required.';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!isValidPassword(password)) errors.password = 'Password must be between 8 and 128 characters.';
  return errors;
}

// Validates the profile edit form.
export function validateProfileForm({ first_name, last_name, course, bio }) {
  const errors = {};
  if (!isNonEmptyString(first_name, { max: 100 })) errors.first_name = 'First name is required.';
  if (!isNonEmptyString(last_name, { max: 100 })) errors.last_name = 'Last name is required.';
  if (course && !isNonEmptyString(course, { max: 50 })) errors.course = 'Course code looks too long.';
  if (bio && bio.length > 2000) errors.bio = 'Bio must be 2000 characters or fewer.';
  return errors;
}
