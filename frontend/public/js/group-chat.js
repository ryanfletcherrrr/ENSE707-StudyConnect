
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatStatus = document.getElementById('chat-status');
const chatSendBtn = document.getElementById('chat-send-btn');

// Temporary sample data for frontend testing
const sampleMessages = [
  {
    id: 1,
    sender: 'Alex',
    text: 'Hey everyone! When should we meet to study?',
    time: '10:00 AM',
  },
  {
    id: 2,
    sender: 'Jamie',
    text: 'How about Thursday afternoon?',
    time: '10:05 AM',
  },
];

function displayMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';

  const senderElement = document.createElement('p');
  senderElement.className = 'chat-message__sender';
  senderElement.textContent = message.sender;

  const textElement = document.createElement('p');
  textElement.className = 'chat-message__text';
  textElement.textContent = message.text;

  const timeElement = document.createElement('span');
  timeElement.className = 'chat-message__time';
  timeElement.textContent = message.time;

  messageElement.append(
    senderElement,
    textElement,
    timeElement
  );

  chatMessages.appendChild(messageElement);
}

function renderMessages() {
  chatMessages.replaceChildren();

  if (sampleMessages.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'chat-empty';
    emptyMessage.textContent =
      'No messages yet. Start the conversation!';

    chatMessages.appendChild(emptyMessage);
    return;
  }

  sampleMessages.forEach(displayMessage);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener('submit', (event) => {
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

  chatSendBtn.disabled = true;
  chatStatus.textContent = '';

  try {
    sampleMessages.push({
      id: Date.now(),
      sender: 'You',
      text,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    renderMessages();

    chatInput.value = '';
    chatInput.focus();
  } catch (error) {
    chatStatus.textContent = 'Could not send the message.';
  } finally {
    chatSendBtn.disabled = false;
  }
});

renderMessages();
