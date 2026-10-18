import { api, clearToken } from './api.js';

const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatStatus = document.getElementById('chat-status');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMembersList = document.getElementById('chat-members-list');

const params = new URLSearchParams(window.location.search);
const slotId = Number(params.get('slotId'));

let currentStudentId = null;
let isLoadingMessages = false;
let messageRefreshInterval = null;
let lastMessageId = 0;

function handleAuthError(error) {
  if (error.status === 401) {
    clearToken();
    window.location.href = 'login.html';
    return true;
  }

  return false;
}

function formatMessageTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value.replace(' ', 'T')}Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';

  const senderElement = document.createElement('p');
  senderElement.className = 'chat-message__sender';

  const senderName =
    `${message.first_name ?? ''} ${message.last_name ?? ''}`.trim();

  senderElement.textContent =
    Number(message.student_id) === currentStudentId
      ? 'You'
      : senderName || 'Unknown student';

  const textElement = document.createElement('p');
  textElement.className = 'chat-message__text';
  textElement.textContent = message.message;

  const timeElement = document.createElement('span');
  timeElement.className = 'chat-message__time';
  timeElement.textContent = formatMessageTime(message.created_at);

  messageElement.append(
    senderElement,
    textElement,
    timeElement
  );

  chatMessages.appendChild(messageElement);
}

function renderMessages(messages) {
  chatMessages.replaceChildren();
  lastMessageId = 0;

  if (!messages || messages.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'chat-empty';
    emptyMessage.textContent =
      'No messages yet. Start the conversation!';

    chatMessages.appendChild(emptyMessage);
    return;
  }

  messages.forEach((message) => {
    displayMessage(message);

    const messageId = Number(message.id);
    if (Number.isFinite(messageId)) {
      lastMessageId = Math.max(lastMessageId, messageId);
    }
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendNewMessages(messages) {
  const newMessages = messages
    .filter((message) => Number(message.id) > lastMessageId)
    .sort((a, b) => Number(a.id) - Number(b.id));

  if (newMessages.length === 0) {
    return;
  }

  const emptyMessage = chatMessages.querySelector('.chat-empty');
  if (emptyMessage) {
    emptyMessage.remove();
  }

  const wasNearBottom =
    chatMessages.scrollHeight -
      chatMessages.scrollTop -
      chatMessages.clientHeight <
    100;

  newMessages.forEach((message) => {
    displayMessage(message);
    lastMessageId = Math.max(lastMessageId, Number(message.id));
  });

  if (wasNearBottom) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function renderMembers(members) {
  chatMembersList.replaceChildren();

  if (!members || members.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No members found.';
    chatMembersList.appendChild(emptyMessage);
    return;
  }

  members.forEach((member) => {
    const memberElement = document.createElement('div');
    memberElement.className = 'chat-member';

    const avatarElement = document.createElement('span');
    avatarElement.className = 'chat-member__avatar';

    const fullName =
      `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim();

    avatarElement.textContent =
      fullName.charAt(0).toUpperCase() || '?';

    const nameElement = document.createElement('span');
    nameElement.className = 'chat-member__name';
    nameElement.textContent =
      Number(member.id) === currentStudentId
        ? `${fullName || 'Student'} (You)`
        : fullName || 'Unknown student';

    memberElement.append(avatarElement, nameElement);
    chatMembersList.appendChild(memberElement);
  });
}

async function loadMessages() {
  if (isLoadingMessages) {
    return;
  }

  isLoadingMessages = true;

  try {
    const result = await api.getChatMessages(slotId);
    appendNewMessages(result.messages || []);
  } catch (error) {
    if (handleAuthError(error)) {
      stopAutomaticRefresh();
      return;
    }

    chatStatus.textContent =
      error.message || 'Could not load chat messages.';
  } finally {
    isLoadingMessages = false;
  }
}

async function loadMembers() {
  const result = await api.getChatMembers(slotId);
  renderMembers(result.members || []);
}

function startAutomaticRefresh() {
  stopAutomaticRefresh();

  messageRefreshInterval = setInterval(() => {
    loadMessages();
  }, 3000);
}

function stopAutomaticRefresh() {
  if (messageRefreshInterval !== null) {
    clearInterval(messageRefreshInterval);
    messageRefreshInterval = null;
  }
}

async function loadChat() {
  if (!Number.isInteger(slotId) || slotId <= 0) {
    chatStatus.textContent =
      'A valid group slot was not provided. Please open the chat from your study group.';

    chatForm.querySelectorAll('input, button').forEach((element) => {
      element.disabled = true;
    });

    return;
  }

  chatStatus.textContent = 'Loading chat...';

  try {
    const profile = await api.getProfile();

    currentStudentId = Number(
      profile.student?.id ?? profile.id ?? profile.studentId
    );

    const [messageResult, memberResult] = await Promise.all([
      api.getChatMessages(slotId),
      api.getChatMembers(slotId),
    ]);

    renderMessages(messageResult.messages || []);
    renderMembers(memberResult.members || []);

    chatStatus.textContent = '';
    startAutomaticRefresh();
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }

    chatStatus.textContent =
      error.message || 'Could not load the group chat.';

    if (error.status === 403 || error.status === 404) {
      chatForm.querySelectorAll('input, button').forEach((element) => {
        element.disabled = true;
      });
    }
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();

  if (!text) {
    chatStatus.textContent = 'Please enter a message.';
    return;
  }

  if (text.length > 1000) {
    chatStatus.textContent =
      'Messages cannot exceed 1000 characters.';
    return;
  }

  if (!Number.isInteger(slotId) || slotId <= 0) {
    chatStatus.textContent = 'A valid group slot is required.';
    return;
  }

  chatSendBtn.disabled = true;
  chatStatus.textContent = '';

  try {
    await api.sendChatMessage(slotId, text);
    chatInput.value = '';
    await loadMessages();
    chatInput.focus();
  } catch (error) {
    if (handleAuthError(error)) {
      return;
    }

    chatStatus.textContent =
      error.message || 'Could not send the message.';
  } finally {
    chatSendBtn.disabled = false;
  }
});

window.addEventListener('beforeunload', stopAutomaticRefresh);

loadChat();
