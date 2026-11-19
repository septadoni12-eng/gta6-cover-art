// Poster Ink Cover Studio: wires the editor page to the poster renderer.
//
// Photos are read from the person's own machine (or the two built-in samples)
// and never leave it. The editor keeps a small photo library; the selected
// panel takes the clicked photo, and the panel's photo can be dragged and
// zoomed on the live preview. One click exports the cover as a PNG in the
// three common post sizes. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { drawPoster, LAYOUTS, GRADES } from './poster.js';
import { runShot } from './shots.js';

export const SIZES = [
  { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

const canvas = document.getElementById('cover');
const captionEl = document.getElementById('caption');
const kickerEl = document.getElementById('kicker');
const statusEl = document.getElementById('status');
const libraryEl = document.getElementById('library');
const panelsEl = document.getElementById('panels');
const zoomEl = document.getElementById('zoom');

export const state = {
  layout: 'hero-four',
  grade: 'vice-sunset',
  mode: 'multi',
  size: 'wide',
  caption: 'Sunset Heist',
  kicker: 'Leonida Nights',
  texture: 0.8,
  panels: [],
  selected: 0,
};
const library = [];

function layoutPanels() {
  return LAYOUTS.find((l) => l.id === state.layout).panels;
}

function ensurePanels() {
  const n = layoutPanels().length;
  while (state.panels.length < n) state.panels.push({ img: null, ox: 0, oy: 0, zoom: 1 });
  if (state.selected >= n) state.selected = 0;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Renders the current state onto the preview canvas at the chosen size. */
export function redraw() {
  ensurePanels();
  const size = SIZES.find((s) => s.id === state.size);
  canvas.width = size.w;
  canvas.height = size.h;
  state.caption = captionEl.value;
  state.kicker = kickerEl.value;
  drawPoster(canvas, state);
  renderPanelList();
}

function renderPanelList() {
  panelsEl.innerHTML = '';
  layoutPanels().forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-chip' + (i === state.selected ? ' on' : '');
    b.textContent = state.panels[i]?.img ? `Panel ${i + 1} ✓` : `Panel ${i + 1} — empty`;
    b.addEventListener('click', () => { state.selected = i; syncZoom(); redraw(); });
    panelsEl.appendChild(b);
  });
}

function renderLibrary() {
  libraryEl.innerHTML = '';
  library.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = item.name;
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      ensurePanels();
      state.panels[state.selected] = { img: item.img, ox: 0, oy: 0, zoom: 1 };
      statusEl.textContent = `${item.name} → panel ${state.selected + 1}. Click another photo for the next panel, or drag the cover to position it.`;
      syncZoom();
      redraw();
    });
    libraryEl.appendChild(b);
  });
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  library.push({ url, name, img });
  if (!state.panels.some((p) => p.img)) {
    ensurePanels();
    state.panels[0] = { img, ox: 0, oy: 0, zoom: 1 };
  }
  renderLibrary();
  redraw();
}

function syncZoom() {
  const p = state.panels[state.selected];
  zoomEl.value = String(Math.round((p?.zoom ?? 1) * 100));
}

function fillSelect(el, items, value) {
  el.innerHTML = '';
  for (const item of items) {
    const o = document.createElement('option');
    o.value = item.id;
    o.textContent = item.name;
    el.appendChild(o);
  }
  el.value = value;
}

function wire() {
  fillSelect(document.getElementById('layout'), LAYOUTS, state.layout);
  fillSelect(document.getElementById('grade'), GRADES, state.grade);
  fillSelect(document.getElementById('size'), SIZES, state.size);
  document.getElementById('layout').addEventListener('change', (e) => { state.layout = e.target.value; state.selected = 0; syncZoom(); redraw(); });
  document.getElementById('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
  document.getElementById('size').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
  document.getElementById('mode').addEventListener('change', (e) => { state.mode = e.target.value; redraw(); });
  document.getElementById('texture').addEventListener('input', (e) => { state.texture = Number(e.target.value) / 100; redraw(); });
  captionEl.addEventListener('input', redraw);
  kickerEl.addEventListener('input', redraw);
  zoomEl.addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (p) { p.zoom = Number(e.target.value) / 100; redraw(); }
  });
  document.getElementById('photos').addEventListener('change', async (e) => {
    for (const file of e.target.files) await addPhoto(URL.createObjectURL(file), file.name);
    statusEl.textContent = 'Photos added. Click a photo to fill the selected panel.';
  });
  document.getElementById('fill-all').addEventListener('click', () => {
    const item = library[library.length - 1];
    if (!item) return;
    state.mode = 'sliced';
    document.getElementById('mode').value = 'sliced';
    state.panels[0] = { img: item.img, ox: 0, oy: 0, zoom: 1 };
    state.selected = 0;
    statusEl.textContent = 'One photo now fills every panel as one sliced scene.';
    syncZoom();
    redraw();
  });
  document.getElementById('export').addEventListener('click', () => {
    const size = SIZES.find((s) => s.id === state.size);
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `poster-ink-cover-${size.w}x${size.h}.png`;
      a.click();
      statusEl.textContent = `Saved poster-ink-cover-${size.w}x${size.h}.png`;
    }, 'image/png');
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = state.panels[state.mode === 'sliced' ? 0 : state.selected];
    if (!p?.img) return;
    const rect = canvas.getBoundingClientRect();
    p.ox = Math.min(1, Math.max(-1, p.ox + (e.clientX - drag.x) / rect.width * 2));
    p.oy = Math.min(1, Math.max(-1, p.oy + (e.clientY - drag.y) / rect.height * 2));
    drag = { x: e.clientX, y: e.clientY };
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  wire();
  (async () => {
    const samples = [await loadImage('samples/pier.jpg'), await loadImage('samples/boulevard.jpg')];
    await runShot(shot, new URLSearchParams(location.search), { state, samples, redraw });
  })();
} else {
  wire();
  (async () => {
    await addPhoto('samples/pier.jpg', 'Sample — the pier');
    await addPhoto('samples/boulevard.jpg', 'Sample — the boulevard');
    state.panels[1] = { img: library[1].img, ox: 0, oy: 0, zoom: 1 };
    state.panels[2] = { img: library[0].img, ox: 0, oy: 0, zoom: 1.15 };
    syncZoom();
    redraw();
    statusEl.textContent = 'Samples loaded — add your own photos, pick a panel, click a photo to fill it.';
  })();
}
