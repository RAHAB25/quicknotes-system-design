'use strict';

const API_URL = 'https://jsonplaceholder.typicode.com/posts';
const loadButton = document.querySelector('#load-btn');
const statusMessage = document.querySelector('#status');
const noteForm = document.querySelector('#note-form');
const titleInput = document.querySelector('#title-input');
const bodyInput = document.querySelector('#body-input');
const submitButton = document.querySelector('#submit-btn');
const notesList = document.querySelector('#notes-list');

/** Fetch JSON and reject non-2xx responses with a useful error. */
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText || 'HTTP error'}).`);
  }
  // DELETE responses may have no body; callers can opt out of JSON parsing.
  if (response.status === 204 || options.expectNoContent) {
    return { data: null, status: response.status };
  }
  const data = await response.json();
  return { data, status: response.status };
}

function setStatus(message, kind = '') {
  statusMessage.textContent = message;
  statusMessage.className = kind ? `status status--${kind}` : 'status';
}

function createNoteElement(note) {
  const item = document.createElement('li');
  item.className = 'note-card';
  const title = document.createElement('h3');
  title.textContent = note.title || '(Untitled note)';
  const body = document.createElement('p');
  body.textContent = note.body || 'No body provided.';
  const meta = document.createElement('small');
  meta.textContent = `Note ID: ${note.id}`;
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'delete-btn';
  removeButton.textContent = 'Delete';
  removeButton.addEventListener('click', () => deleteNote(note.id, item, removeButton));
  item.append(title, body, meta, removeButton);
  return item;
}

function renderNotes(notes) {
  notesList.replaceChildren();
  if (!notes.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No notes yet. Create a note or load sample notes.';
    notesList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  notes.forEach((note) => fragment.append(createNoteElement(note)));
  notesList.append(fragment);
}

async function loadNotes() {
  loadButton.disabled = true;
  setStatus('Loading notes...');
  try {
    const { data: notes } = await request(`${API_URL}?_limit=10`);
    renderNotes(notes);
    if (notes.length) setStatus(`Loaded ${notes.length} notes from the server.`, 'success');
    else setStatus('The server returned no notes.', 'success');
  } catch (error) {
    setStatus(`Could not load notes. ${error.message} Please try again.`, 'error');
    if (!notesList.children.length) renderNotes([]);
  } finally {
    loadButton.disabled = false;
  }
}

async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!title) {
    setStatus('Please enter a title.', 'error');
    titleInput.focus();
    return;
  }
  if (title.length > 100) {
    setStatus('Title must be 100 characters or fewer.', 'error');
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus('Creating note...');
  try {
    const { data: note, status } = await request(API_URL, {
      method: 'POST',
      body: JSON.stringify({ title, body, userId: 1 }),
    });
    // JSONPlaceholder returns a simulated created record; it does not persist it.
    // Add the response locally so the demo feels responsive, but a reload will not retain it.
    notesList.querySelector('.empty-state')?.remove();
    notesList.prepend(createNoteElement(note));
    setStatus(`Note created (status ${status}, id ${note.id}).`, 'success');
    noteForm.reset();
  } catch (error) {
    setStatus(`Could not create note. ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteNote(id, item, button) {
  button.disabled = true;
  setStatus(`Deleting note ${id}...`);
  try {
    await request(`${API_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      expectNoContent: true,
    });
    // DELETE is simulated by JSONPlaceholder. Remove the item from this page only.
    item.remove();
    if (!notesList.children.length) renderNotes([]);
    setStatus(`Note ${id} deleted from this view. JSONPlaceholder does not persist changes.`, 'success');
  } catch (error) {
    setStatus(`Could not delete note. ${error.message}`, 'error');
    button.disabled = false;
  }
}

loadButton.addEventListener('click', loadNotes);
noteForm.addEventListener('submit', createNote);
