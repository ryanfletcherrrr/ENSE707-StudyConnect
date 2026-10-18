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
    return value || 'Not specified';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
          event.status !== 'cancelled' &&
          !Number.isNaN(startTime) &&
          startTime >= now
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
          'subtitle',
          'You have no upcoming study events.'
        )
      );
      return;
    }

    const eventsToShow = upcomingEvents.slice(0, 3);

    for (const event of eventsToShow) {
      const card = createElement(
        'article',
        'my-group dashboard-event'
      );

      const title = createElement(
        'h3',
        '',
        event.title || 'Untitled event'
      );

      const start = createElement(
        'p',
        'my-group__meta',
        `Starts: ${formatDateTime(event.start_time)}`
      );

      const end = createElement(
        'p',
        'my-group__meta',
        `Ends: ${formatDateTime(event.end_time)}`
      );

      const location = createElement(
        'p',
        'my-group__meta',
        `Location: ${event.location || 'Not specified'}`
      );

      card.append(title, start, end, location);

      if (event.group_name) {
        card.append(
          createElement(
            'p',
            'my-group__meta',
            `Study group: ${event.group_name}`
          )
        );
      }

      if (event.invitation_status) {
        card.append(
          createElement(
            'p',
            'my-group__meta',
            `Invitation: ${event.invitation_status}`
          )
        );
      }

      dashboardEventsEl.append(card);
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