/**
 * Raag Suggester — Hindustani time-theory based suggestions
 */

const state = {
  raagWindows: [],
  useNow: true,
  selectedMinutes: 0,
};

const els = {
  useNow: document.getElementById("use-now"),
  timeInput: document.getElementById("time-input"),
  nowText: document.getElementById("now-text"),
  timeline: document.getElementById("timeline"),
  raagList: document.getElementById("raag-list"),
  slotTitle: document.getElementById("slot-title"),
  slotNote: document.getElementById("slot-note"),
};

async function loadData() {
  const res = await fetch('./data/raagas.json');
  if (!res.ok) throw new Error('Failed to load raaga data');
  const data = await res.json();
  state.raagWindows = data.windows;
  renderTimeline(data);
  updateTimeNow();
  updateUI();
}

function minutesFromTimeInput(value) {
  const [hh, mm] = value.split(":").map(Number);
  return (hh * 60 + mm) % 1440;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatMinutes(mins) {
  mins = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function updateTimeNow() {
  const d = new Date();
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
  els.nowText.textContent = `${time} (${tz})`;
}

function isMinuteInWindow(minute, start, end) {
  // Handles wrap-around windows (e.g., 21:00-03:00)
  if (start <= end) {
    return minute >= start && minute < end;
  }
  return minute >= start || minute < end;
}

function findWindow(minute) {
  for (const w of state.raagWindows) {
    if (isMinuteInWindow(minute, w.startMin, w.endMin)) return w;
  }
  return null;
}

function updateUI() {
  const minute = state.useNow ? getNowMinutes() : state.selectedMinutes;
  if (!state.useNow) {
    els.timeInput.value = formatMinutes(minute);
  }

  const currentWindow = findWindow(minute);
  renderResults(currentWindow, minute);
  highlightTimeline(currentWindow);
}

function renderResults(win, minute) {
  els.raagList.innerHTML = '';
  if (!win) {
    els.slotTitle.textContent = 'Suggested Raags';
    els.slotNote.textContent = 'No window matched.';
    return;
  }
  const titleTime = `${formatMinutes(win.startMin)}–${formatMinutes(win.endMin)}`;
  els.slotTitle.textContent = `${win.label} (${titleTime})`;

  for (const name of win.raagas) {
    const li = document.createElement('li');
    li.textContent = name;
    els.raagList.appendChild(li);
  }

  els.slotNote.textContent = win.note || '';
}

function renderTimeline(data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'timeline-segments';

  // 24 hour columns, we will mark the active window separately
  for (let h = 0; h < 24; h++) {
    const div = document.createElement('div');
    div.className = 'segment';
    div.title = `${pad2(h)}:00`;
    div.dataset.hour = h;
    div.addEventListener('click', () => {
      state.useNow = false;
      els.useNow.checked = false;
      els.timeInput.disabled = false;
      state.selectedMinutes = h * 60; // snap to hour
      updateUI();
    });
    wrapper.appendChild(div);
  }

  const labels = document.createElement('div');
  labels.className = 'timeline-labels';
  labels.innerHTML = '<span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>';

  els.timeline.innerHTML = '';
  els.timeline.appendChild(wrapper);
  els.timeline.appendChild(labels);
}

function highlightTimeline(currentWindow) {
  const segments = els.timeline.querySelectorAll('.segment');
  segments.forEach(seg => {
    const h = Number(seg.dataset.hour);
    const start = currentWindow?.startMin ?? -1;
    const end = currentWindow?.endMin ?? -1;
    const minute = h * 60;
    const active = currentWindow ? isMinuteInWindow(minute, start, end) : false;
    seg.setAttribute('data-active', String(active));
  });
}

function attachEvents() {
  els.useNow.addEventListener('change', () => {
    state.useNow = els.useNow.checked;
    els.timeInput.disabled = state.useNow;
    updateUI();
  });

  els.timeInput.addEventListener('input', () => {
    state.selectedMinutes = minutesFromTimeInput(els.timeInput.value);
    updateUI();
  });

  // Keep the 'Now' display fresh
  setInterval(() => {
    if (state.useNow) {
      updateTimeNow();
      updateUI();
    }
  }, 30_000);
}

window.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  loadData().catch(err => {
    console.error(err);
    els.slotNote.textContent = 'Failed to load data.';
  });
});