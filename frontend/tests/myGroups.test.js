import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatMemberCount, buildStudyGroupHref } from '../public/js/myGroups.js';

test('formatMemberCount shows members out of capacity', () => {
  assert.equal(formatMemberCount({ member_count: 3, capacity: 6 }), '3 of 6 members');
  assert.equal(formatMemberCount({ member_count: 1, capacity: 2 }), '1 of 2 members');
});

test('buildStudyGroupHref builds the study-group page link with group and slot ids', () => {
  assert.equal(
    buildStudyGroupHref({ id: 7, slot_id: 12 }),
    'study-group.html?id=7&slotId=12',
  );
});

test('dashboard.html has an aria-live "My groups" region and no stale placeholder', () => {
  const html = readFileSync(new URL('../public/dashboard.html', import.meta.url), 'utf8');
  assert.match(html, /id="my-groups-message"[^>]*aria-live="polite"/);
  assert.match(html, /id="my-groups-list"/);
  assert.doesNotMatch(html, /My groups and my schedule are not part of this build slice/);
});
