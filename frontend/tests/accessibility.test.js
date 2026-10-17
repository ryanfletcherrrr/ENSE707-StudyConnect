// Regression tests for DEF-04 (form errors not exposed to assistive
// technology) and DEF-06 (placeholder colour left to the browser's
// unmeasured default) from the QA pass (StudyConnect_Defect_Log.xlsx).
// These fixes were originally committed in an earlier session whose
// commits never reached GitHub (git push was blocked for that session), so
// they're being redone here - see the project build log for the original
// findings.
//
// This project is dependency-free (no jsdom/testing-library - see
// README.md), so these tests read the actual shipped HTML/CSS as text and
// check the markup directly, rather than rendering it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

function read(file) {
  return readFileSync(path.join(publicDir, file), 'utf8');
}

// Pages that have form fields with validation errors. dashboard.html has no
// form fields, so it's intentionally excluded here (per the original
// defect log's note on DEF-04's scope).
const PAGES_WITH_FORMS = ['index.html', 'register.html', 'profile.html'];

for (const page of PAGES_WITH_FORMS) {
  test(`DEF-04 (${page}): every field-error element has aria-live and a stable id`, () => {
    const html = read(page);
    const errorDivs = [...html.matchAll(/<div class="field-error"[^>]*>/g)].map((m) => m[0]);

    assert.ok(errorDivs.length > 0, `${page} should have at least one field-error element`);

    for (const div of errorDivs) {
      assert.match(div, /aria-live="polite"/, `${div} is missing aria-live`);
      assert.match(div, /id="[a-z_]+-error"/, `${div} is missing a stable id`);
    }
  });

  test(`DEF-04 (${page}): every field-error id is referenced by a matching input's aria-describedby`, () => {
    const html = read(page);
    const errorIds = [...html.matchAll(/<div class="field-error"[^>]*\bid="([a-z_]+-error)"/g)].map((m) => m[1]);

    for (const id of errorIds) {
      const describedByPattern = new RegExp(`aria-describedby="${id}"`);
      assert.match(html, describedByPattern, `no input on ${page} has aria-describedby="${id}"`);
    }
  });
}

test('DEF-02/DEF-03 (UI caps mirror the backend limits): bio and password inputs carry maxlength', () => {
  const profile = read('profile.html');
  assert.match(profile, /<textarea id="bio"[^>]*maxlength="2000"/, 'bio textarea should cap input at 2000 chars');

  const register = read('register.html');
  assert.match(register, /<input type="password" id="password"[^>]*maxlength="128"/, 'password input should cap input at 128 chars');
});

test('DEF-06: style.css sets an explicit placeholder colour instead of the browser default', () => {
  const css = readFileSync(path.join(publicDir, 'css', 'style.css'), 'utf8');
  assert.match(css, /::placeholder\s*{[^}]*color:\s*var\(--text-muted\)/s);
});
