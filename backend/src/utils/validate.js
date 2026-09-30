const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// DEF-03: password had a minimum length but no maximum, so an oversized
// password was hashed as-is (unbounded scrypt input). 128 matches the cap
// already enforced in the UI (register.html).
const MAX_PASSWORD_LENGTH = 128;

// DEF-02: bio had no length limit at all - a direct API call could save an
// unbounded bio (tested to 50,000 chars) despite no documented limit. 2000
// matches the cap enforced in the UI (profile.html).
export const MAX_BIO_LENGTH = 2000;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

export function isNonEmptyString(value, { max = 255 } = {}) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

// Password rule for the prototype: between 8 and 128 characters.
// (Kept intentionally simple - this is a sample-data prototype, not a
// production authentication system.)
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= MAX_PASSWORD_LENGTH;
}

// DEF-02: bio is optional, so null/undefined are valid; when present it
// must be a string within the length cap.
export function isValidBio(bio) {
  if (bio === null || bio === undefined) return true;
  return typeof bio === 'string' && bio.length <= MAX_BIO_LENGTH;
}
