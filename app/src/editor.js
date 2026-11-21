// Golden Tide Cover Studio — editor.
//
// Wires the sidebar controls to the cover engine (src/cover.js): photos,
// panels, lettering, grades, layouts and export. The preview canvas redraws
// on every change; drag pans a panel's photo, scroll zooms it, and the
// face-aware crop keeps the face in frame unless the user moves it.
//
// ?shot=cover renders just the finished cover, full frame, for the screenshots
// (the app's own drawing of its export, at the gate's size); ?shot=editor
// opens the editor with a sample photo loaded.

import { SIZES, GRADES, GRADE_IDS, LAYOUT_IDS, LAYOUT_NAMES, drawCover, renderCoverToCanvas, layoutRectsFor } from './cover.js';
import { SAMPLES, DEFAULT_PANELS, sampleById } from './samples.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

// --- state ------------------------------------------------------------------

function freshPanels() {
  return DEFAULT_PANELS.map((p) => {
    const s = sampleById(p.photo);
    return { photo: p.photo, role: p.role, zoom: 1, dx: 0, dy: 0, face: s.face ?? null, focus: s.focus ?? null };
  });
}

const state = {
  size: 'wide',
  layout: 'hero',
  grade: 'sunset',
  title: 'GOLDEN TIDE',
  subtitle: 'one last golden summer',
  quote: 'THE HOTTEST RIDE OF THE YEAR',
  tagline: 'SEVEN FRIENDS · ONE COAST · NO WAY BACK',
  panels: freshPanels(),
};

let selectedPanel = 0;
let pickedPhoto = 'boulevard';

// The photo registry: every photo the studio can draw, sample or uploaded.
// A panel stores its own zoom/pan plus a copy of the photo's face anchor.
const photos = new Map();

function registerPhoto(id, name, img, face = null, focus = null, sample = false) {
  photos.set(id, { id, name, img, face, focus, sample });
  return photos.get(id);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      registerPhoto(s.id, s.name, img, s.face ?? null, s.focus ?? null, true);
    } catch {
      // A missing sample just leaves its panel empty; the studio still works.
    }
  }
}

// The images map drawCover wants: photo id -> HTMLImageElement.
function imagesMap() {
  const m = new Map();
  for (const [id, p] of photos) m.set(id, p.img);
  return m;
}

function status(text) {
  const el = $('status');
  if (el) el.textContent = text;
}

// --- preview ----------------------------------------------------------------

const PREVIEW_SIZE = {
  wide: { w: 960, h: 540 },
  story: { w: 540, h: 675 },
  square: { w: 600, h: 600 },
};

function redraw() {
  const dims = PREVIEW_SIZE[state.size];
  if (preview.width !== dims.w || preview.height !== dims.h) {
    preview.width = dims.w;
    preview.height = dims.h;
  }
  const size = SIZES[state.size];
  drawCover(pctx, size.w, size.h, state, imagesMap());
}

function snapshot() {
  return JSON.stringify(state);
}

const history = [];
let historyAt = -1;
function commit(label) {
  history.length = historyAt + 1;
  history.push(snapshot());
  if (history.length > 50) history.shift();
  historyAt = history.length - 1;
  if (label) status(label);
}
function restore(json) {
  const next = JSON.parse(json);
  Object.assign(state, next);
  syncControls();
  redraw();
}
function undo() {
  if (historyAt <= 0) return;
  historyAt--;
  restore(history[historyAt]);
  status('Undid that change.');
}
function redo() {
  if (historyAt >= history.length - 1) return;
  historyAt++;
  restore(history[historyAt]);
  status('Redid that change.');
}

// --- sidebar UI ---------------------------------------------------------------

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  for (const s of SAMPLES) {
    const fig = document.createElement('figure');
    if (pickedPhoto === s.id) fig.className = 'picked';
    fig.innerHTML = `<img src="${s.src}" alt="${s.name} sample photo"><figcaption>${s.name}</figcaption>`;
    fig.addEventListener('click', () => {
      pickedPhoto = s.id;
      buildPhotoStrip();
      assignPhotoToPanel(s.id);
    });
    strip.appendChild(fig);
  }
}

function buildPanelList() {
  const list = $('panelList');
  list.innerHTML = '';
  state.panels.forEach((p, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'panel-chip' + (i === selectedPanel ? ' selected' : '');
    const photo = photos.get(p.photo);
    chip.innerHTML = `${i === 0 ? '★ ' : ''}Panel ${i + 1}<small>${p.role} · ${photo ? photo.name : 'empty'}</small>`;
    chip.addEventListener('click', () => {
      selectedPanel = i;
      syncControls();
      redraw();
    });
    list.appendChild(chip);
  });
}

function buildGradeRow() {
  const row = $('gradeRow');
  row.innerHTML = '';
  for (const id of GRADE_IDS) {
    const g = GRADES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-swatch' + (state.grade === id ? ' active' : '');
    btn.innerHTML = `<span style="background:linear-gradient(135deg, ${g.skyTop}, ${g.skyMid} 55%, ${g.skyBot})">${g.name}</span>`;
    btn.addEventListener('click', () => {
      state.grade = id;
      buildGradeRow();
      commit(`Grade: ${g.name}.`);
      redraw();
    });
    row.appendChild(btn);
  }
}

function buildPhotoSelect() {
  const sel = $('photoSelect');
  sel.innerHTML = '';
  for (const [id, p] of photos) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = p.name + (p.sample ? ' (sample)' : ' (yours)');
    sel.appendChild(opt);
  }
  sel.value = state.panels[selectedPanel].photo;
}

function syncControls() {
  const p = state.panels[selectedPanel];
  $('roleInput').value = p.role;
  $('zoomRange').value = Math.round(p.zoom * 100);
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('quoteInput').value = state.quote;
  $('taglineInput').value = state.tagline;
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  buildPanelList();
  buildPhotoSelect();
  buildGradeRow();
}

function assignPhotoToPanel(photoId) {
  const p = state.panels[selectedPanel];
  const photo = photos.get(photoId);
  if (!photo) return;
  p.photo = photoId;
  p.zoom = 1;
  p.dx = 0;
  p.dy = 0;
  p.face = photo.face ?? null;
  p.focus = photo.focus ?? null;
  buildPhotoSelect();
  buildPanelList();
  commit(`Panel ${selectedPanel + 1} now shows ${photo.name}.`);
  redraw();
}

// --- pointer: drag to pan, scroll to zoom -------------------------------------

let drag = null;

function panelAt(px, py) {
  if (state.layout !== 'hero') return 0;
  const rects = layoutRectsFor(state.size, preview.width, preview.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

function canvasPoint(event) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * preview.width,
    y: ((event.clientY - rect.top) / rect.height) * preview.height,
  };
}

preview.addEventListener('pointerdown', (event) => {
  const pt = canvasPoint(event);
  const hit = panelAt(pt.x, pt.y);
  if (hit >= 0) {
    selectedPanel = hit;
    syncControls();
    redraw();
  }
  const size = SIZES[state.size];
  drag = { panel: selectedPanel, x: pt.x, y: pt.y, scale: size.w / preview.width };
  preview.setPointerCapture(event.pointerId);
});

preview.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const pt = canvasPoint(event);
  const p = state.panels[drag.panel];
  p.dx += (pt.x - drag.x) * drag.scale;
  p.dy += (pt.y - drag.y) * drag.scale;
  drag.x = pt.x;
  drag.y = pt.y;
  redraw();
});

preview.addEventListener('pointerup', () => {
  if (drag) {
    drag = null;
    commit('Moved the photo in its panel.');
  }
});

let wheelTimer = null;
preview.addEventListener('wheel', (event) => {
  event.preventDefault();
  const p = state.panels[selectedPanel];
  p.zoom = Math.min(2.6, Math.max(1, p.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
  $('zoomRange').value = Math.round(p.zoom * 100);
  redraw();
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => commit('Zoomed the photo.'), 400);
}, { passive: false });

// --- controls -----------------------------------------------------------------

function wireControls() {
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      syncControls();
      commit(`Size: ${SIZES[state.size].label}.`);
      redraw();
    });
  });
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      syncControls();
      commit(`Layout: ${LAYOUT_NAMES[state.layout]}.`);
      redraw();
    });
  });
  $('roleInput').addEventListener('input', (e) => {
    state.panels[selectedPanel].role = e.target.value.toUpperCase();
    buildPanelList();
    redraw();
  });
  $('roleInput').addEventListener('change', () => commit('Renamed the role tag.'));
  $('photoSelect').addEventListener('change', (e) => assignPhotoToPanel(e.target.value));
  $('zoomRange').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value) / 100;
    redraw();
  });
  $('zoomRange').addEventListener('change', () => commit('Zoomed the photo.'));
  $('centerFaceBtn').addEventListener('click', () => {
    const p = state.panels[selectedPanel];
    p.dx = 0;
    p.dy = 0;
    p.zoom = 1;
    syncControls();
    commit('Centered on the face.');
    redraw();
  });
  $('fillBtn').addEventListener('click', () => {
    const p = state.panels[selectedPanel];
    p.dx = 0;
    p.dy = 0;
    p.zoom = 1;
    syncControls();
    commit('Reset the panel framing.');
    redraw();
  });
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('titleInput').addEventListener('change', () => commit('Edited the title.'));
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitleInput').addEventListener('change', () => commit('Edited the subtitle.'));
  $('quoteInput').addEventListener('input', (e) => { state.quote = e.target.value; redraw(); });
  $('quoteInput').addEventListener('change', () => commit('Edited the press quote.'));
  $('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
  $('taglineInput').addEventListener('change', () => commit('Edited the tagline.'));
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('exportBtn').addEventListener('click', () => exportSize(state.size));
  $('exportAllBtn').addEventListener('click', exportAllSizes);
  $('fileInput').addEventListener('change', (e) => handleUpload(e.target.files));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

async function handleUpload(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    try {
      const img = await loadImage(dataUrl);
      const id = `up${Date.now()}_${added}`;
      registerPhoto(id, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Your photo', img);
      if (added === 0) assignPhotoToPanel(id);
      added++;
    } catch {
      status(`Could not read ${file.name}.`);
    }
  }
  if (added > 0) {
    buildPhotoSelect();
    status(`${added} photo${added > 1 ? 's' : ''} loaded — drag to frame, scroll to zoom.`);
  }
}

// --- export -------------------------------------------------------------------

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

function exportSize(sizeKey) {
  const canvas = renderCoverToCanvas(state, imagesMap(), sizeKey);
  downloadCanvas(canvas, `golden-tide-${sizeKey}.png`);
  status(`Exported ${SIZES[sizeKey].label} PNG — share it.`);
}

function exportAllSizes() {
  for (const key of Object.keys(SIZES)) {
    const canvas = renderCoverToCanvas(state, imagesMap(), key);
    downloadCanvas(canvas, `golden-tide-${key}.png`);
  }
  status('Exported all 3 sizes: Wide, Story and Square PNGs.');
}

// --- ?shot scenes (for the entry's screenshots) -------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

function applyShotParams() {
  if (params.get('size') && SIZES[params.get('size')]) state.size = params.get('size');
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('layout') && LAYOUT_IDS.includes(params.get('layout'))) state.layout = params.get('layout');
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('quote')) state.quote = params.get('quote');
  if (params.get('tagline')) state.tagline = params.get('tagline');
}

async function drawShotCover() {
  document.body.classList.add('shot-mode');
  applyShotParams();
  preview.width = window.innerWidth;
  preview.height = window.innerHeight;
  const size = SIZES[state.size];
  drawCover(pctx, preview.width, preview.height, state, imagesMap());
  document.title = 'cover-ready';
  window.__shotReady = true;
}

// --- init ---------------------------------------------------------------------

async function init() {
  wireControls();
  await loadSamples();
  buildPhotoStrip();
  buildGradeRow();
  buildPanelList();
  buildPhotoSelect();
  syncControls();
  try {
    await document.fonts.load(`900 100px 'CoverTitle'`);
    await document.fonts.load(`900 60px 'CoverScript'`);
    await document.fonts.ready;
  } catch {
    // Fallback fonts still draw the cover; the shipped fonts are preferred.
  }
  commit('Cover ready — pick a sample or upload your own photos.');
  if (shot === 'cover') {
    await drawShotCover();
  } else {
    redraw();
    if (shot === 'editor') {
      status('Editor open with the Boulevard sample loaded — drag a panel to reframe it.');
      document.title = 'editor-ready';
      window.__shotReady = true;
    }
  }
}

init();
