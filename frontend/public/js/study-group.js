import { api, getToken, clearToken } from './api.js';

const titleEl = document.getElementById('group-title');
const messageEl = document.getElementById('group-message');
const groupDetailsEl = document.getElementById('group-details');
const leaveGroupBtn = document.getElementById('leave-group-btn');
const logoutBtn = document.getElementById('logout-btn');
const resourceForm = document.getElementById('resource-form');
const resourceTitle = document.getElementById('resource-title');
const resourceUrl = document.getElementById('resource-url');
const resourceDescription = document.getElementById('resource-description');
const resourceMessage = document.getElementById('resource-message');
const resourceList = document.getElementById('resource-list');

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

        await loadLearningResources();
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

async function loadLearningResources() {
    try {
        const { resources } = await api.getLearningResources(studyGroupId);

        resourceList.innerHTML = '';

        if (!resources || resources.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No resources shared yet.';
            resourceList.appendChild(emptyMessage);
            return;
        }

        for (const resource of resources) {
            const item = document.createElement('div');

            const title = document.createElement('strong');
            title.textContent = resource.title;

            const link = document.createElement('a');
            link.href = resource.url;
            link.textContent = resource.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            const sharedBy = document.createElement('p');
            sharedBy.textContent =
                `Shared by ${resource.first_name} ${resource.last_name}`;

            item.appendChild(title);
            item.appendChild(document.createElement('br'));
            item.appendChild(link);

            if (resource.description) {
                const description = document.createElement('p');
                description.textContent = resource.description;
                item.appendChild(description);
            }

            item.appendChild(sharedBy);
            resourceList.appendChild(item);
        }
    } catch (err) {
        if (err.status === 401) {
            clearToken();
            window.location.href = 'index.html';
            return;
        }

        resourceList.innerHTML = '';

        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Could not load learning resources.';
        resourceList.appendChild(errorMessage);
    }
}

resourceForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    resourceMessage.textContent = '';

    const resource = {
        title: resourceTitle.value.trim(),
        url: resourceUrl.value.trim(),
        description: resourceDescription.value.trim(),
    };

    try {
        await api.shareLearningResource(studyGroupId, resource);

        resourceMessage.textContent = 'Learning resource shared successfully.';
        resourceForm.reset();

        await loadLearningResources();
    } catch (err) {
        if (err.status === 401) {
            clearToken();
            window.location.href = 'index.html';
            return;
        }

        resourceMessage.textContent =
            err.message || 'Could not share learning resource.';
    }
});