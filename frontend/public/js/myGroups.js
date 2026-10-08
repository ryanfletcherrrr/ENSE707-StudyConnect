// Small pure helpers for the dashboard's "My groups" section, kept separate
// from dashboard.js (which touches the DOM) so they can be unit tested.

// "3 of 6 members" - singular-safe for a capacity-1 slot is not possible
// (capacity is always 2-20), so only the member count needs no pluralising.
export function formatMemberCount({ member_count, capacity }) {
  return `${member_count} of ${capacity} members`;
}

// Link to the existing study-group page, which needs both the group id and
// the slot the student is in (see study-group.js).
export function buildStudyGroupHref({ id, slot_id }) {
  return `study-group.html?id=${encodeURIComponent(id)}&slotId=${encodeURIComponent(slot_id)}`;
}
