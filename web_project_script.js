const STORAGE_KEY = "studio_pad_state_v1";

const panel = document.getElementById("floating-panel");
const header = document.getElementById("panel-header");
const resizeHandle = document.getElementById("resize-handle");
const reopenBtn = document.getElementById("reopen-btn");
const backdrop = document.getElementById("backdrop");

const btnToggle = document.getElementById("btn-toggle");
const btnCenter = document.getElementById("btn-center");
const themeSelect = document.getElementById("theme-select");
const bgUpload = document.getElementById("bg-upload");
const btnClearBg = document.getElementById("btn-clear-bg");

const noteInput = document.getElementById("note-input");
const charCount = document.getElementById("char-count");
const btnSaveNote = document.getElementById("btn-save-note");
const btnClearNote = document.getElementById("btn-clear-note");

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskStats = document.getElementById("task-stats");
const statusMsg = document.getElementById("status-msg");

const defaultState = {
  hidden: false,
  theme: "dark",
  bgImage: "",
  note: "",
  tasks: [],
  rect: {
    left: 64,
    top: 64,
    width: 680,
    height: 460,
  },
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      rect: {
        ...structuredClone(defaultState.rect),
        ...(parsed.rect || {}),
      },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    setStatus("Storage limit reached (try smaller background image)");
  }
}

function setStatus(message) {
  statusMsg.textContent = message;
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.classList.remove("theme-light", "theme-retro");
  if (theme === "light") document.body.classList.add("theme-light");
  if (theme === "retro") document.body.classList.add("theme-retro");
  themeSelect.value = theme;
  saveState();
}

function applyBackground(dataUrl) {
  state.bgImage = dataUrl || "";
  backdrop.style.backgroundImage = state.bgImage ? `url("${state.bgImage}")` : "none";
  saveState();
}

function applyRect() {
  const maxLeft = Math.max(12, window.innerWidth - 120);
  const maxTop = Math.max(12, window.innerHeight - 80);
  state.rect.left = Math.min(Math.max(12, state.rect.left), maxLeft);
  state.rect.top = Math.min(Math.max(12, state.rect.top), maxTop);
  state.rect.width = Math.max(380, Math.min(state.rect.width, window.innerWidth - 24));
  state.rect.height = Math.max(320, Math.min(state.rect.height, window.innerHeight - 24));

  panel.style.left = `${state.rect.left}px`;
  panel.style.top = `${state.rect.top}px`;
  panel.style.width = `${state.rect.width}px`;
  panel.style.height = `${state.rect.height}px`;
  saveState();
}

function centerPanel() {
  const width = panel.offsetWidth || state.rect.width;
  const height = panel.offsetHeight || state.rect.height;
  state.rect.left = Math.max(12, Math.round((window.innerWidth - width) / 2));
  state.rect.top = Math.max(12, Math.round((window.innerHeight - height) / 2));
  applyRect();
  setStatus("Centered panel");
}

function setPanelHidden(hidden) {
  state.hidden = Boolean(hidden);
  panel.classList.toggle("hidden", state.hidden);
  reopenBtn.classList.toggle("hidden", !state.hidden);
  saveState();
  setStatus(state.hidden ? "Panel hidden (@ to reopen)" : "Panel visible");
}

function updateNoteCounter() {
  const len = noteInput.value.length;
  charCount.textContent = `${len} ${len === 1 ? "char" : "chars"}`;
}

function renderTasks() {
  taskList.innerHTML = "";
  let doneCount = 0;

  state.tasks.forEach((task) => {
    if (task.done) doneCount += 1;

    const li = document.createElement("li");
    li.className = "task-item";

    const left = document.createElement("div");
    left.className = "task-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveState();
      renderTasks();
    });

    const span = document.createElement("span");
    span.className = `task-text${task.done ? " done" : ""}`;
    span.textContent = task.text;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Delete task";
    delBtn.addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveState();
      renderTasks();
      setStatus("Deleted task");
    });

    left.append(checkbox, span);
    li.append(left, delBtn);
    taskList.appendChild(li);
  });

  taskStats.textContent = `${doneCount} / ${state.tasks.length} done`;
}

// Dragging
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDragging = false;

header.addEventListener("mousedown", (e) => {
  if (e.target.closest("button")) return;
  isDragging = true;
  dragOffsetX = e.clientX - panel.offsetLeft;
  dragOffsetY = e.clientY - panel.offsetTop;
  e.preventDefault();
});

// Resizing
let isResizing = false;
let startX = 0;
let startY = 0;
let startW = 0;
let startH = 0;

resizeHandle.addEventListener("mousedown", (e) => {
  isResizing = true;
  startX = e.clientX;
  startY = e.clientY;
  startW = panel.offsetWidth;
  startH = panel.offsetHeight;
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    state.rect.left = e.clientX - dragOffsetX;
    state.rect.top = e.clientY - dragOffsetY;
    applyRect();
  } else if (isResizing) {
    state.rect.width = startW + (e.clientX - startX);
    state.rect.height = startH + (e.clientY - startY);
    applyRect();
  }
});

window.addEventListener("mouseup", () => {
  if (isDragging || isResizing) {
    isDragging = false;
    isResizing = false;
    saveState();
  }
});

window.addEventListener("resize", applyRect);

// Shortcuts: @ to toggle, [ to center
window.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

  if (e.key === "@" && !isTyping) {
    e.preventDefault();
    setPanelHidden(!state.hidden);
  } else if ((e.key === "[" || e.key === "{") && !isTyping) {
    e.preventDefault();
    centerPanel();
  }
});

btnToggle.addEventListener("click", () => setPanelHidden(true));
reopenBtn.addEventListener("click", () => setPanelHidden(false));
btnCenter.addEventListener("click", centerPanel);

themeSelect.addEventListener("change", (e) => {
  applyTheme(e.target.value);
  setStatus(`Switched theme to ${e.target.value}`);
});

bgUpload.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      applyBackground(reader.result);
      setStatus(`Applied background: ${file.name}`);
    }
  };
  reader.readAsDataURL(file);
});

btnClearBg.addEventListener("click", () => {
  bgUpload.value = "";
  applyBackground("");
  setStatus("Cleared custom background");
});

noteInput.addEventListener("input", () => {
  state.note = noteInput.value;
  updateNoteCounter();
  saveState();
});

btnSaveNote.addEventListener("click", () => {
  state.note = noteInput.value;
  saveState();
  setStatus("Saved note");
});

btnClearNote.addEventListener("click", () => {
  noteInput.value = "";
  state.note = "";
  updateNoteCounter();
  saveState();
  setStatus("Cleared note");
});

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  state.tasks.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
  });
  taskInput.value = "";
  saveState();
  renderTasks();
  setStatus("Added task");
});

// Initial hydrate
noteInput.value = state.note;
updateNoteCounter();
applyTheme(state.theme);
applyBackground(state.bgImage);
applyRect();
setPanelHidden(state.hidden);
renderTasks();
