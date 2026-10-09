// QuickNotes API client (talks to the JSONPlaceholder practice API)
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;
const FIRST_FAKE_ID = 101; // ids JSONPlaceholder hands out for created notes

const loadBtn = document.getElementById("load-btn");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const notesList = document.getElementById("notes-list");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");

/* ---------- UI helpers ---------- */

// type: "loading" | "success" | "error" (CSS styles each one differently)
function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

// Disable every control that could start another request.
function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  document.querySelectorAll(".delete-btn").forEach((btn) => (btn.disabled = isBusy));
}

function showEmptyState() {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No notes yet. Click \"Load notes\" or add one below.";
  notesList.replaceChildren(li);
}

function removeEmptyState() {
  const empty = notesList.querySelector("li.empty");
  if (empty) empty.remove();
}

// User text is only ever inserted with textContent (never innerHTML).
function createNoteElement(note, isLocal) {
  const li = document.createElement("li");
  li.dataset.id = note.id;
  li.dataset.local = isLocal ? "true" : "false";

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body || "";

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete-btn";
  del.textContent = "Delete";
  del.setAttribute("aria-label", "Delete note: " + note.title);
  del.addEventListener("click", () => handleDelete(note.id, li));

  li.append(title, body, del);
  return li;
}

/* ---------- Reusable request helper ---------- */

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error("Request failed with status " + response.status);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return { data, status: response.status };
}

/* ---------- GET: load 10 notes ---------- */

async function loadNotes() {
  setBusy(true);
  setStatus("Loading notes...", "loading");
  try {
    const { data } = await request(API_URL + "?_limit=10");
    notesList.replaceChildren();
    if (data.length === 0) {
      showEmptyState();
      setStatus("The server has no notes to show.", "success");
    } else {
      data.forEach((note) => notesList.append(createNoteElement(note, false)));
      setStatus("Loaded " + data.length + " notes from the server.", "success");
    }
  } catch (err) {
    console.error(err);
    setStatus("Could not load notes. Check your connection and try again.", "error");
  } finally {
    setBusy(false);
  }
}

/* ---------- POST: create a note ---------- */

function validateTitle(title) {
  if (title.length === 0) return "Please enter a title.";
  if (title.length > MAX_TITLE_LENGTH) {
    return "Title must be " + MAX_TITLE_LENGTH + " characters or fewer (currently " + title.length + ").";
  }
  return null;
}

async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    titleInput.focus();
    return;
  }

  setBusy(true);
  setStatus("Saving note...", "loading");
  try {
    const { data, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });
    removeEmptyState();
    // Add the returned note to the TOP of the list.
    notesList.prepend(createNoteElement({ ...data, title, body }, true));
    setStatus("Note created (status " + status + ", id " + data.id + ").", "success");
    form.reset();
  } catch (err) {
    console.error(err);
    setStatus("Could not save the note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

/* ---------- DELETE: remove a note ---------- */

/*
 * JSONPlaceholder is a fake API: it accepts writes but never stores them.
 * A note created with POST gets id 101, but a later DELETE /posts/101 may
 * answer 404 because the server never saved it.
 * My approach: always send the DELETE request (so the real flow is exercised),
 * but treat a 404 for a note I created locally in this session as success,
 * since "it no longer exists on the server" is exactly what the user wanted.
 * A 404 for a note loaded from the server is still shown as an error.
 * The UI only removes the note after the request succeeds.
 */
async function deleteNote(id, isLocal) {
  try {
    return await request(API_URL + "/" + id, { method: "DELETE" });
  } catch (err) {
    if (err.status === 404 && isLocal) return { status: 404 };
    throw err;
  }
}

async function handleDelete(id, listItem) {
  const isLocal = listItem.dataset.local === "true" || Number(id) >= FIRST_FAKE_ID;
  setBusy(true);
  setStatus("Deleting note...", "loading");
  try {
    await deleteNote(id, isLocal);
    listItem.remove();
    if (notesList.children.length === 0) showEmptyState();
    setStatus("Note " + id + " deleted.", "success");
  } catch (err) {
    console.error(err);
    setStatus("Could not delete note " + id + ". It was not removed.", "error");
  } finally {
    setBusy(false);
  }
}

/* ---------- Wire up events ---------- */

loadBtn.addEventListener("click", loadNotes);
form.addEventListener("submit", createNote);
showEmptyState();
