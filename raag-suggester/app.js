/**
 * Raag Suggester — Hindustani time-theory based suggestions
 */

const state = {
  raagWindows: [],
  raagDetails: {},
  useNow: true,
  selectedMinutes: 0,
};

const els = {
  useNow: document.getElementById("use-now"),
  timeInput: document.getElementById("time-input"),
  nowText: document.getElementById("now-text"),
  timeline: document.getElementById("timeline"),
  chakra: document.getElementById("chakra"),
  raagList: document.getElementById("raag-list"),
  slotTitle: document.getElementById("slot-title"),
  slotNote: document.getElementById("slot-note"),
  modal: document.getElementById("modal"),
  modalClose: document.getElementById("modal-close"),
  modalBody: document.getElementById("modal-body"),
  modalTitle: document.getElementById("modal-title"),
};

async function loadData() {
  let data = null;
  try {
    const res = await fetch('./data/raagas.json');
    if (!res.ok) throw new Error('Failed to load raaga data');
    data = await res.json();
  } catch (e) {
    const embedded = document.getElementById('embedded-raagas');
    if (embedded?.textContent) {
      try { data = JSON.parse(embedded.textContent); } catch {}
    }
  }
  if (!data) throw new Error('No raaga data available');
  state.raagWindows = data.windows;
  state.raagDetails = data.details || {};
  renderTimeline();
  renderChakra();
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
  renderResults(currentWindow);
  highlightTimeline(currentWindow);
  updateChakraHighlight(currentWindow);
  updateChakraHand(minute);
}

function renderResults(win) {
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
    li.className = 'raag-item';
    li.tabIndex = 0;
    li.addEventListener('click', () => openRaagModal(name));
    li.addEventListener('keypress', (e) => { if (e.key === 'Enter') openRaagModal(name); });
    els.raagList.appendChild(li);
  }

  els.slotNote.textContent = win.note || '';
}

function renderTimeline() {
  const wrapper = document.createElement('div');
  wrapper.className = 'timeline-segments';
  for (let h = 0; h < 24; h++) {
    const div = document.createElement('div');
    div.className = 'segment';
    div.title = `${pad2(h)}:00`;
    div.dataset.hour = h;
    div.addEventListener('click', () => {
      state.useNow = false;
      els.useNow.checked = false;
      els.timeInput.disabled = false;
      state.selectedMinutes = h * 60;
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
    const minute = h * 60;
    const active = currentWindow ? isMinuteInWindow(minute, currentWindow.startMin, currentWindow.endMin) : false;
    seg.setAttribute('data-active', String(active));
  });
}

// ====== Samay Chakra ======
function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180.0; // 0 at 12 o'clock
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const startOuter = polar(cx, cy, rOuter, startDeg);
  const endOuter = polar(cx, cy, rOuter, endDeg);
  const startInner = polar(cx, cy, rInner, endDeg);
  const endInner = polar(cx, cy, rInner, startDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z'
  ].join(' ');
}

function minutesToDeg(min) { return (min / 1440) * 360; }

let chakraSvg, chakraHand;

function renderChakra() {
  els.chakra.innerHTML = '';
  const size = 420;
  const cx = size / 2, cy = size / 2;
  const rOuter = 190, rInner = 130, rLabel = 210;

  chakraSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chakraSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // background circle
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', rOuter + 8);
  bg.setAttribute('fill', '#0b1220');
  bg.setAttribute('stroke', '#1f2937');
  chakraSvg.appendChild(bg);

  // segments
  state.raagWindows.forEach((w, idx) => {
    const startDeg = minutesToDeg(w.startMin);
    const endDeg = minutesToDeg(w.endMin);
    const wraps = w.startMin > w.endMin;
    const segments = wraps ? [
      { s: startDeg, e: 360 },
      { s: 0, e: endDeg },
    ] : [{ s: startDeg, e: endDeg }];

    segments.forEach(({s, e}) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(cx, cy, rOuter, rInner, s, e));
      path.setAttribute('class', 'segment-path');
      path.dataset.windowId = w.id;
      path.addEventListener('click', () => {
        state.useNow = false;
        els.useNow.checked = false;
        els.timeInput.disabled = false;
        // pick midpoint
        const duration = (w.endMin - w.startMin + 1440) % 1440;
        state.selectedMinutes = (w.startMin + Math.floor(duration / 2)) % 1440;
        updateUI();
      });
      chakraSvg.appendChild(path);
    });

    // label at middle angle
    const duration = (w.endMin - w.startMin + 1440) % 1440;
    const mid = (w.startMin + duration / 2) % 1440;
    const p = polar(cx, cy, rLabel, minutesToDeg(mid));
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', p.x);
    text.setAttribute('y', p.y);
    text.setAttribute('class', 'segment-label');
    text.textContent = w.label;
    chakraSvg.appendChild(text);
  });

  // hand for current time
  chakraHand = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  chakraHand.setAttribute('x1', cx);
  chakraHand.setAttribute('y1', cy);
  chakraHand.setAttribute('x2', cx);
  chakraHand.setAttribute('y2', cy - rInner - 12);
  chakraHand.setAttribute('class', 'hand');
  chakraSvg.appendChild(chakraHand);

  els.chakra.appendChild(chakraSvg);
}

function updateChakraHighlight(currentWindow) {
  const paths = chakraSvg?.querySelectorAll('.segment-path') || [];
  paths.forEach(p => {
    const w = state.raagWindows.find(x => x.id === p.dataset.windowId);
    const minute = state.useNow ? getNowMinutes() : state.selectedMinutes;
    const active = currentWindow ? isMinuteInWindow(minute, w.startMin, w.endMin) : false;
    p.setAttribute('data-active', String(active));
  });
}

function updateChakraHand(minute) {
  if (!chakraSvg || !chakraHand) return;
  const size = 420; const cx = size / 2, cy = size / 2; const rInner = 130;
  const p = polar(cx, cy, rInner + 12, minutesToDeg(minute));
  chakraHand.setAttribute('x2', p.x);
  chakraHand.setAttribute('y2', p.y);
}

// ====== Modal ======
function openRaagModal(name) {
  const info = state.raagDetails[name];
  els.modalTitle.textContent = name;
  const parts = [];
  if (info?.description) parts.push(`<p>${escapeHtml(info.description)}</p>`);
  const meta = [];
  if (info?.thaat) meta.push(`<div><strong>Thaat:</strong> ${escapeHtml(info.thaat)}</div>`);
  if (info?.vadi) meta.push(`<div><strong>Vadi:</strong> ${escapeHtml(info.vadi)}</div>`);
  if (info?.samvadi) meta.push(`<div><strong>Samvadi:</strong> ${escapeHtml(info.samvadi)}</div>`);
  if (info?.aroha) meta.push(`<div><strong>Aroha:</strong> ${escapeHtml(info.aroha)}</div>`);
  if (info?.avaroha) meta.push(`<div><strong>Avaroha:</strong> ${escapeHtml(info.avaroha)}</div>`);
  if (meta.length) parts.push(`<div class="meta">${meta.join('')}</div>`);

  if (info?.links?.length) {
    const links = info.links.map(l => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`).join('');
    parts.push(`<div class="links">${links}</div>`);
  } else {
    parts.push('<p class="muted">No links available. We will add more soon.</p>');
  }

  els.modalBody.innerHTML = parts.join('');
  els.modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  els.modal.setAttribute('aria-hidden', 'true');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function escapeAttr(s) {
  return escapeHtml(s);
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

  // Modal events
  els.modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) closeModal();
  });
  els.modalClose.addEventListener('click', closeModal);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

window.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  loadData().catch(err => {
    console.error(err);
    els.slotNote.textContent = 'Failed to load data.';
  });
});