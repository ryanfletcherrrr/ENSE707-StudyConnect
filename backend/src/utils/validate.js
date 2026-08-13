const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

export function isNonEmptyString(value, { max = 255 } = {}) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

// Minimum password rule for the prototype: at least 8 characters.
// (Kept intentionally simple - this is a sample-data prototype, not a
// production authentication system.)
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}
