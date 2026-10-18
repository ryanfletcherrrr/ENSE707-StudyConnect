
import { api, getToken, clearToken } from './api.js';

const notificationList = document.getElementById('notification-list');
const notificationMessage = document.getElementById('notification-message');
const logoutButton = document.getElementById('logout-btn');

if (!getToken()) {
  window.location.href = 'index.html';
}

logoutButton.addEventListener('click', () => {
  clearToken();
  window.location.href = 'index.html';
});

async function loadNotifications() {
  notificationMessage.textContent = 'Loading notifications...';
  notificationList.replaceChildren();

  try {
    const data = await api.getNotifications();
    const notifications = data.notifications || [];

    if (notifications.length === 0) {
      notificationMessage.textContent = 'You have no notifications yet.';
      return;
    }

    notificationMessage.textContent = '';

    for (const notification of notifications) {
      const item = document.createElement('div');
      item.className = 'card';

      const title = document.createElement('h3');
      title.textContent = notification.title;

      const message = document.createElement('p');
      message.textContent = notification.message;

      const status = document.createElement('p');
      status.className = 'subtitle';
      status.textContent = notification.is_read ? 'Read' : 'Unread';

      item.append(title, message, status);

      if (!notification.is_read) {
        const readButton = document.createElement('button');
        readButton.type = 'button';
        readButton.textContent = 'Mark as read';

        readButton.addEventListener('click', async () => {
          readButton.disabled = true;

          try {
            await api.markNotificationAsRead(notification.id);
            await loadNotifications();
          } catch (error) {
            notificationMessage.textContent =
              error.message || 'Could not update notification.';
            readButton.disabled = false;
          }
        });

        item.appendChild(readButton);
      }

      notificationList.appendChild(item);
    }
  } catch (error) {
    if (error.status === 401) {
      clearToken();
      window.location.href = 'index.html';
      return;
    }

    notificationMessage.textContent =
      error.message || 'Could not load notifications.';
  }
}

loadNotifications();
