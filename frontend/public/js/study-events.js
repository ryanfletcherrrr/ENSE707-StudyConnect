import { api, clearToken } from './api.js';

const eventsList = document.getElementById('events-list');
const eventsMessage = document.getElementById('events-message');
const formCard = document.getElementById('event-form-card');
const eventForm = document.getElementById('event-form');
const formHeading = document.getElementById('event-form-heading');
const saveButton = document.getElementById('save-event-btn');
const groupSelect = document.getElementById('study-group');
const studentSearch = document.getElementById('student-search');
const studentSearchResults = document.getElementById('student-search-results');
const selectedInviteesContainer = document.getElementById('selected-invitees');

let events = [];
let studyGroups = [];
let editingEventId = null;
let selectedInvitees = new Map();
let searchRequestNumber = 0;

document.getElementById('logout-btn').addEventListener('click', () => {
    clearToken();
    window.location.href = 'index.html';
});

document.getElementById('show-create-btn').addEventListener('click', () => {
    openCreateForm();
});

document.getElementById('cancel-form-btn').addEventListener('click', () => {
    closeForm();
});

eventForm.addEventListener('submit', saveEvent);

studentSearch.addEventListener('input', () => {
    searchInvitees(studentSearch.value);
});

function showMessage(message, type = 'success') {
    eventsMessage.textContent = message;
    eventsMessage.className = `message visible ${type}`;
}

function clearMessage() {
    eventsMessage.textContent = '';
    eventsMessage.className = 'message';
}

function getErrorMessage(error) {
    if (error.status === 401) {
        clearToken();
        window.location.href = 'index.html';
        return 'Your session has expired. Please log in again.';
    }

    return error.message || 'Something went wrong. Please try again.';
}

function getGroupId(group) {
    return group.id ?? group.study_group_id;
}

function getGroupName(group) {
    return group.group_name ?? group.name ?? `Study group ${getGroupId(group)}`;
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

async function loadPage() {
    clearMessage();
    eventsList.replaceChildren(
        createElement('p', 'subtitle', 'Loading events…')
    );

    try {
        const [eventResponse, groupResponse] = await Promise.all([
            api.getMyManagedStudyEvents(),
            api.getMyStudyGroups(),
        ]);

        events = Array.isArray(eventResponse)
            ? eventResponse
            : eventResponse.events ?? [];

        studyGroups = Array.isArray(groupResponse)
            ? groupResponse
            : groupResponse.groups ?? groupResponse.studyGroups ?? [];

        renderEvents();
        renderGroupOptions();
    } catch (error) {
        eventsList.replaceChildren(
            createElement('p', 'event-empty', getErrorMessage(error))
        );
        showMessage(getErrorMessage(error), 'error');
    }
}

function renderGroupOptions(selectedId = '') {
    groupSelect.replaceChildren();

    const placeholder = createElement('option', '', 'Choose a study group');
    placeholder.value = '';
    groupSelect.append(placeholder);

    for (const group of studyGroups) {
        const id = getGroupId(group);

        if (!id) {
            continue;
        }

        const option = createElement('option', '', getGroupName(group));
        option.value = String(id);
        option.selected = String(id) === String(selectedId);
        groupSelect.append(option);
    }

    groupSelect.disabled = studyGroups.length === 0;

    if (studyGroups.length === 0) {
        placeholder.textContent = 'You need to join a study group first';
    }
}

function renderEvents() {
    eventsList.replaceChildren();

    if (events.length === 0) {
        eventsList.append(
            createElement('p', 'event-empty', 'You have no upcoming events yet.')
        );
        return;
    }

    for (const event of events) {
        const card = createElement('article', 'event-card');
        const title = createElement('h3', '', event.title || 'Untitled event');
        const status = createElement(
            'span',
            'event-status',
            event.status || 'scheduled'
        );

        const description = createElement(
            'p',
            '',
            event.description || 'No description provided.'
        );

        const matchingGroup = studyGroups.find(
            (item) => String(getGroupId(item)) === String(event.study_group_id)
        );

        const groupName =
            event.group_name ||
            (matchingGroup
                ? getGroupName(matchingGroup)
                : `Study group ${event.study_group_id}`);

        const group = createElement('p', '', `Study group: ${groupName}`);

        const details = createElement('div', 'event-meta');
        details.append(
            createElement('span', '', `Starts: ${formatDateTime(event.start_time)}`),
            createElement('span', '', `Ends: ${formatDateTime(event.end_time)}`),
            createElement('span', '', `Location: ${event.location || 'Not specified'}`),
            createElement(
                'span',
                '',
                event.created_by === event.current_student_id
                    ? 'Created by you'
                    : `Invitation: ${event.invitation_status || 'Event creator'}`
            )
        );

        card.append(title, status, description, group, details);

        if (event.status !== 'cancelled') {
            const actions = createElement('div', 'event-actions');

            if (event.is_creator !== false) {
                const editButton = createElement('button', 'secondary', 'Edit');
                editButton.type = 'button';
                editButton.addEventListener('click', () => openEditForm(event));

                const cancelButton = createElement('button', 'danger-button', 'Cancel event');
                cancelButton.type = 'button';
                cancelButton.addEventListener('click', () => cancelEvent(event));

                actions.append(editButton, cancelButton);
            }

            card.append(actions);
        }

        eventsList.append(card);
    }
}

function renderSelectedInvitees() {
    selectedInviteesContainer.replaceChildren();

    if (selectedInvitees.size === 0) {
        selectedInviteesContainer.append(
            createElement('p', 'subtitle', 'No students selected.')
        );
        return;
    }

    selectedInviteesContainer.append(
        createElement('h3', '', `Selected students (${selectedInvitees.size})`)
    );

    for (const student of selectedInvitees.values()) {
        const item = createElement('div', 'event-invitee');
        const name = createElement(
            'span',
            '',
            `${student.first_name} ${student.last_name} (${student.email})`
        );
        const removeButton = createElement('button', 'secondary', 'Remove');
        removeButton.type = 'button';
        removeButton.addEventListener('click', () => {
            selectedInvitees.delete(student.id);
            renderSelectedInvitees();
            renderSearchResults(currentSearchResults);
        });

        item.append(name, removeButton);
        selectedInviteesContainer.append(item);
    }
}

let currentSearchResults = [];

function renderSearchResults(students) {
    currentSearchResults = students;
    studentSearchResults.replaceChildren();

    if (!studentSearch.value.trim()) {
        studentSearchResults.append(
            createElement('p', 'subtitle', 'Enter a name, email, or course to search.')
        );
        return;
    }

    if (students.length === 0) {
        studentSearchResults.append(
            createElement('p', 'subtitle', 'No matching registered students found.')
        );
        return;
    }

    for (const student of students) {
        const item = createElement('label', 'event-student-result');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedInvitees.has(student.id);

        const details = createElement(
            'span',
            '',
            `${student.first_name} ${student.last_name} · ${student.email}${student.course ? ` · ${student.course}` : ''}`
        );

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedInvitees.set(student.id, student);
            } else {
                selectedInvitees.delete(student.id);
            }

            renderSelectedInvitees();
        });

        item.append(checkbox, details);
        studentSearchResults.append(item);
    }
}

async function searchInvitees(searchTerm) {
    const requestNumber = ++searchRequestNumber;
    const query = searchTerm.trim();

    if (!query) {
        renderSearchResults([]);
        return;
    }

    studentSearchResults.replaceChildren(
        createElement('p', 'subtitle', 'Searching students…')
    );

    try {
        const response = await api.searchStudyEventStudents(query);

        if (requestNumber !== searchRequestNumber) {
            return;
        }

        const students = Array.isArray(response)
            ? response
            : response.students ?? [];

        renderSearchResults(students);
    } catch (error) {
        if (requestNumber === searchRequestNumber) {
            studentSearchResults.replaceChildren(
                createElement('p', 'event-empty', getErrorMessage(error))
            );
        }
    }
}

function resetInvitees() {
    selectedInvitees = new Map();
    studentSearch.value = '';
    currentSearchResults = [];
    renderSelectedInvitees();
    renderSearchResults([]);
}

function openCreateForm() {
    editingEventId = null;
    eventForm.reset();
    resetInvitees();
    formHeading.textContent = 'Create a study event';
    saveButton.textContent = 'Create event';
    renderGroupOptions();
    formCard.hidden = false;
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function openEditForm(event) {
    clearMessage();

    try {
        const response = await api.getStudyEvent(event.id);
        const fullEvent = response.event;
        const participants = response.participants ?? [];

        editingEventId = fullEvent.id;
        eventForm.reset();
        resetInvitees();

        for (const student of participants) {
            selectedInvitees.set(student.student_id, {
                id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
            });
        }

        renderSelectedInvitees();

        formHeading.textContent = 'Edit study event';
        saveButton.textContent = 'Save changes';

        renderGroupOptions(fullEvent.study_group_id);

        document.getElementById('event-title').value = fullEvent.title || '';
        document.getElementById('event-description').value = fullEvent.description || '';
        document.getElementById('start-time').value = toDateTimeLocal(fullEvent.start_time);
        document.getElementById('end-time').value = toDateTimeLocal(fullEvent.end_time);
        document.getElementById('event-location').value = fullEvent.location || '';

        formCard.hidden = false;
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        showMessage(getErrorMessage(error), 'error');
    }
}

function toDateTimeLocal(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
}

function closeForm() {
    formCard.hidden = true;
    eventForm.reset();
    editingEventId = null;
    resetInvitees();
}

async function saveEvent(event) {
    event.preventDefault();
    clearMessage();

    const startValue = document.getElementById('start-time').value;
    const endValue = document.getElementById('end-time').value;

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (
        !startValue ||
        !endValue ||
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate <= startDate
    ) {
        showMessage(
            'Please enter a valid start and end time. The end must be after the start.',
            'error'
        );
        return;
    }

    const fields = {
        study_group_id: Number(groupSelect.value),
        title: document.getElementById('event-title').value.trim(),
        description: document.getElementById('event-description').value.trim(),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        location: document.getElementById('event-location').value.trim(),
        invitee_ids: [...selectedInvitees.keys()],
    };

    if (!fields.study_group_id) {
        showMessage('Please select a study group.', 'error');
        return;
    }

    if (!fields.title) {
        showMessage('Please enter an event title.', 'error');
        return;
    }

    saveButton.disabled = true;

    try {
        if (editingEventId) {
            await api.updateStudyEvent(editingEventId, fields);
            showMessage('Study event updated successfully.');
        } else {
            await api.createStudyEvent(fields);
            showMessage('Study event created successfully.');
        }

        closeForm();
        await loadPage();
    } catch (error) {
        showMessage(getErrorMessage(error), 'error');
    } finally {
        saveButton.disabled = false;
    }
}

async function cancelEvent(event) {
    const confirmed = window.confirm(
        `Are you sure you want to cancel "${event.title}"?`
    );

    if (!confirmed) {
        return;
    }

    clearMessage();

    try {
        await api.cancelStudyEvent(event.id);
        showMessage('Study event cancelled successfully.');
        await loadPage();
    } catch (error) {
        showMessage(getErrorMessage(error), 'error');
    }
}

resetInvitees();
loadPage();
