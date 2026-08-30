import { api, getToken, clearToken } from './api.js';

const titleEl = document.getElementById('group-title');
const messageEl = document.getElementById('group-message');
const groupDetailsEl = document.getElementById('group-details');
const leaveGroupBtn = document.getElementById('leave-group-btn');
const logoutBtn = document.getElementById('logout-btn');

if (!getToken()) {
    window.location.href = 'index.html';
}

const params = new URLSearchParams(window.location.search);
const studyGroupId = Number(params.get('id'));
const slotId = Number(params.get('slotId'));

if (
    !Number.isInteger(studyGroupId) ||
    studyGroupId <= 0 ||
    !Number.isInteger(slotId) ||
    slotId <= 0
) {
    messageEl.textContent = 'Invalid study group.';
    leaveGroupBtn.disabled = true;
} else {
    loadStudyGroup();
}

async function loadStudyGroup() {
    try {
        const { slots } = await api.getStudyGroupSlots(studyGroupId);

        const selectedSlot = slots?.find(
            (slot) => Number(slot.id) === slotId
        );

        if (!selectedSlot) {
            messageEl.textContent = 'Study group could not be found.';
            leaveGroupBtn.disabled = true;
            return;
        }

        titleEl.textContent = `Group ${selectedSlot.group_number}`;
        messageEl.textContent = '';

        groupDetailsEl.innerHTML = '';

        const members = document.createElement('p');
        members.textContent =
            `Members: ${selectedSlot.member_count} / ${selectedSlot.capacity}`;

        groupDetailsEl.appendChild(members);
    } catch (err) {
        if (err.status === 401) {
            clearToken();
            window.location.href = 'index.html';
            return;
        }

        messageEl.textContent =
            err.message || 'Could not load the study group.';

        leaveGroupBtn.disabled = true;
    }
}

leaveGroupBtn.addEventListener('click', async () => {
    const confirmed = window.confirm(
        'Are you sure you want to leave this group?'
    );

    if (!confirmed) {
        return;
    }

    leaveGroupBtn.disabled = true;
    messageEl.textContent = '';

    try {
        const result = await api.leaveStudyGroup(slotId);

        messageEl.textContent = result.message;

        window.location.href =
            `join-group.html?id=${studyGroupId}`;
    } catch (err) {
        if (err.status === 401) {
            clearToken();
            window.location.href = 'index.html';
            return;
        }

        messageEl.textContent =
            err.message || 'Could not leave the study group.';

        leaveGroupBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    clearToken();
    window.location.href = 'index.html';
});