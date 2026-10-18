import { api, getToken, clearToken } from './api.js';
import { formatMemberCount, buildStudyGroupHref } from './myGroups.js';

const headingEl = document.getElementById('welcome-heading');
const subtitleEl = document.getElementById('welcome-subtitle');
const logoutBtn = document.getElementById('logout-btn');
const myGroupsMessageEl = document.getElementById('my-groups-message');
const myGroupsListEl = document.getElementById('my-groups-list');
const dashboardEventsEl = document.getElementById('dashboard-events');
const dashboardEventsMessageEl = document.getElementById('dashboard-events-message');

function handleAuthError(error) {
  if (error.status === 401) {
    clearToken();
    window.location.href = 'index.html';
    return true;
  }

  return false;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getDateParts(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { month: 'TBA', day: '--' };
  }

  return {
    month: date.toLocaleDateString([], { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString([], { day: '2-digit' }),
  };
}

function createInfoRow(icon, label, value) {
  const row = createElement('div', 'dashboard-event__info-row');
  const iconEl = createElement('span', 'dashboard-event__icon', icon);
  const textEl = createElement('span', 'dashboard-event__info-text');

  textEl.append(
    createElement('span', 'dashboard-event__info-label', label),
    createElement('span', 'dashboard-event__info-value', value)
  );

  row.append(iconEl, textEl);

  return row;
}

function createEventCard(event) {
  const card = createElement('article', 'dashboard-event');

  const header = createElement('div', 'dashboard-event__header');
  const dateBadge = createElement('div', 'dashboard-event__date');
  const dateParts = getDateParts(event.start_time);

  dateBadge.append(
    createElement('span', 'dashboard-event__month', dateParts.month),
    createElement('span', 'dashboard-event__day', dateParts.day)
  );

  const heading = createElement('div', 'dashboard-event__heading');

  heading.append(
    createElement(
      'h3',
      'dashboard-event__title',
      event.title || 'Study Session'
    ),
    createElement(
      'p',
      'dashboard-event__group',
      event.group_name || 'Study group session'
    )
  );

  const status = createElement(
    'span',
    'dashboard-event__status',
    'Upcoming'
  );

  header.append(dateBadge, heading, status);

  const divider = createElement('div', 'dashboard-event__divider');

  const details = createElement('div', 'dashboard-event__details');

  details.append(
    createInfoRow(
      '◷',
      'Date & time',
      formatDateTime(event.start_time)
    ),
    createInfoRow(
      '◴',
      'Ends',
      formatDateTime(event.end_time)
    ),
    createInfoRow(
      '⌖',
      'Location',
      event.location || 'Not specified'
    )
  );

  const footer = createElement('div', 'dashboard-event__footer');

  const groupLabel = createElement(
    'span',
    'dashboard-event__footer-text',
    event.group_name || 'StudyConnect event'
  );

  footer.append(groupLabel);

  if (event.invitation_status) {
    const invitation = createElement(
      'span',
      'dashboard-event__invitation',
      `Invitation: ${event.invitation_status}`
    );

    footer.append(invitation);
  } else if (Number(event.created_by) === Number(event.student_id)) {
    footer.append(
      createElement(
        'span',
        'dashboard-event__invitation',
        'Created by you'
      )
    );
  }

  card.append(header, divider, details, footer);

  if (event.description) {
    const description = createElement(
      'p',
      'dashboard-event__description',
      event.description
    );

    card.insertBefore(description, divider);
  }

  return card;
}

async function init() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const { student } = await api.getProfile();

    headingEl.textContent = `Welcome, ${student.first_name}`;
    subtitleEl.textContent = student.course
      ? `Signed in as ${student.email} · ${student.course}`
      : `Signed in as ${student.email}`;
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }

    subtitleEl.textContent =
      error.message || 'Could not load your account.';
  }
}

async function loadMyGroups() {
  myGroupsListEl.replaceChildren();
  myGroupsMessageEl.textContent = 'Loading your study groups…';

  try {
    const { groups } = await api.getMyStudyGroups();

    if (!groups || groups.length === 0) {
      myGroupsMessageEl.textContent =
        "You haven't joined any study groups yet. Find one or create your own from the links above.";
      return;
    }

    myGroupsMessageEl.textContent =
      `You are in ${groups.length} study group${groups.length === 1 ? '' : 's'}.`;

    for (const group of groups) {
      const item = createElement('div', 'my-group');
      const link = createElement('a', '', group.group_name);

      link.href = buildStudyGroupHref(group);

      const meta = createElement(
        'p',
        'my-group__meta',
        `${group.course} · Group ${group.group_number} · ${formatMemberCount(group)}`
      );

      item.append(link, meta);
      myGroupsListEl.append(item);
    }
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }

    myGroupsMessageEl.textContent =
      error.message || 'Could not load your study groups.';
  }
}

async function loadDashboardEvents() {
  dashboardEventsEl.replaceChildren(
    createElement('p', 'subtitle', 'Loading your upcoming events…')
  );

  dashboardEventsMessageEl.textContent = '';

  try {
    const response = await api.getMyStudyEvents();

    const allEvents = Array.isArray(response)
      ? response
      : response.events ?? [];

    const now = Date.now();

    const upcomingEvents = allEvents
      .filter((event) => {
        const startTime = new Date(event.start_time).getTime();

        return (
          event.status === 'scheduled' &&
          !Number.isNaN(startTime) &&
          startTime > now
        );
      })
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() -
          new Date(b.start_time).getTime()
      );

    dashboardEventsEl.replaceChildren();

    if (upcomingEvents.length === 0) {
      dashboardEventsEl.append(
        createElement(
          'p',
          'dashboard-event__empty',
          'No upcoming study sessions. Create an event or join one you have been invited to.'
        )
      );
      return;
    }

    const eventsToShow = upcomingEvents.slice(0, 3);

    for (const event of eventsToShow) {
      dashboardEventsEl.append(createEventCard(event));
    }

    if (upcomingEvents.length > eventsToShow.length) {
      dashboardEventsMessageEl.textContent =
        `Showing ${eventsToShow.length} of ${upcomingEvents.length} upcoming events.`;
    }
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }

    dashboardEventsEl.replaceChildren(
      createElement(
        'p',
        'subtitle',
        error.message || 'Could not load your study events.'
      )
    );
  }
}

logoutBtn.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

init();
loadMyGroups();
loadDashboardEvents();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadDashboardEvents();
  }
});

window.addEventListener('pageshow', () => {
  loadDashboardEvents();
});
