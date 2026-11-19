// Poster Ink — editor.
//
// Owns the page: photo library, controls, live preview canvas, drag-to-pan,
// zoom, one-click PNG export, and the ?shot= screenshot scenes (see
// src/shots.js). All drawing goes through renderCover() in poster.js.

import { renderCover, layoutPanels, LAYOUT_NAMES, GRADE_NAMES, POST_SIZES } from './poster.js';
import { SHOT_SCENES, scenePanels } from './shots.js';

const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const shotStage = $('shotStage');
const shotCanvas = $('shotCanvas');
const statusEl = $('status');

// ------------------------------------------------------------ state
const state = {
  layout: 'Hero + Four',
  grade: 'Vice Sunset',
  fill: 'per-panel',
  sizeName: 'Wide 1920 × 1080',
  caption: 'Sunset Heist',
  kicker: 'Leonida Nights',
  texture: 1,
  photos: [],          // HTMLImageElement[]
  panels: [],          // { photo, zoom, ox, oy } per panel
  selected: 0,
};

function panelCount() {
  return layoutPanels(state.layout, 100, 100).length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    state.panels.push({ photo: state.panels.length % Math.max(1, state.photos.length), zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

// ------------------------------------------------------------ rendering
let renderQueued = false;
function draw() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    ensurePanels();
    const [w, h] = POST_SIZES[state.sizeName];
    preview.width = w;
    preview.height = h;
    renderCover(preview, state);
    syncPanelDots();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      state.photos.push(await loadImage(s.src));
    } catch {
      statusEl.textContent = `Could not load sample photo ${s.name}.`;
    }
  }
  rebuildLibrary();
  ensurePanels();
  draw();
}

// ------------------------------------------------------------ library UI
function rebuildLibrary() {
  const lib = $('library');
  lib.innerHTML = '';
  state.photos.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    thumb.title = `Fill selected panel with photo ${i + 1}`;
    thumb.addEventListener('click', () => {
      ensurePanels();
      state.panels[state.selected].photo = i;
      state.panels[state.selected].zoom = 1;
      state.panels[state.selected].ox = 0;
      state.panels[state.selected].oy = 0;
      rebuildLibrary();
      draw();
    });
    if (state.panels[state.selected]?.photo === i) thumb.classList.add('active');
    lib.appendChild(thumb);
  });
}

function syncPanelDots() {
  const dots = $('panelDots');
  const n = panelCount();
  if (dots.childElementCount !== n) {
    dots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Panel ${i + 1}`;
      b.addEventListener('click', () => {
        state.selected = i;
        syncPanelDots();
        syncZoom();
        rebuildLibrary();
      });
      dots.appendChild(b);
    }
  }
  [...dots.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === state.selected)));
}

function syncZoom() {
  const p = state.panels[state.selected];
  if (!p) return;
  $('zoom').value = String(p.zoom);
  $('zoomOut').textContent = `${Math.round(p.zoom * 100)}%`;
}

// ------------------------------------------------------------ controls
function fillSelect(el, names) {
  el.innerHTML = '';
  for (const n of names) {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    el.appendChild(o);
  }
}

function wireControls() {
  fillSelect($('layout'), LAYOUT_NAMES);
  fillSelect($('grade'), GRADE_NAMES);
  fillSelect($('size'), Object.keys(POST_SIZES));
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('size').value = state.sizeName;

  $('layout').addEventListener('change', (e) => { state.layout = e.target.value; draw(); });
  $('grade').addEventListener('change', (e) => { state.grade = e.target.value; draw(); });
  $('fill').addEventListener('change', (e) => { state.fill = e.target.value; draw(); });
  $('size').addEventListener('change', (e) => { state.sizeName = e.target.value; draw(); });
  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; draw(); });
  $('kicker').addEventListener('input', (e) => { state.kicker = e.target.value; draw(); });
  $('texture').addEventListener('input', (e) => {
    state.texture = Number(e.target.value);
    $('textureOut').textContent = `${Math.round(state.texture * 100)}%`;
    draw();
  });
  $('zoom').addEventListener('input', (e) => {
    ensurePanels();
    state.panels[state.selected].zoom = Number(e.target.value);
    $('zoomOut').textContent = `${Math.round(state.panels[state.selected].zoom * 100)}%`;
    draw();
  });

  $('upload').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      try {
        const url = URL.createObjectURL(f);
        state.photos.push(await loadImage(url));
      } catch { /* skip unreadable files */ }
    }
    e.target.value = '';
    rebuildLibrary();
    draw();
  });

  $('onePhoto').addEventListener('click', () => {
    state.fill = 'one';
    $('fill').value = 'one';
    draw();
    statusEl.textContent = 'One photo now fills every panel. Pick a photo in the library to change it.';
  });

  $('export').addEventListener('click', exportPng);
}

async function exportPng() {
  const [w, h] = POST_SIZES[state.sizeName];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off, state);
  statusEl.textContent = 'Exporting…';
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `poster-ink-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  statusEl.textContent = `Exported ${w} × ${h} PNG.`;
}

// ------------------------------------------------------------ drag to pan
function canvasPoint(e) {
  const r = preview.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (preview.width / r.width),
    y: (e.clientY - r.top) * (preview.height / r.height),
  };
}

function hitPanel(pt) {
  const panels = layoutPanels(state.layout, preview.width, preview.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    const topSkew = p.skew || 0;
    // approximate the slanted shape with its bounding box for hit-testing
    if (pt.x >= p.x - Math.abs(topSkew) && pt.x <= p.x + p.w + Math.abs(topSkew)
      && pt.y >= p.y && pt.y <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const i = hitPanel(pt);
  if (i < 0) return;
  state.selected = i;
  syncPanelDots();
  syncZoom();
  rebuildLibrary();
  preview.setPointerCapture(e.pointerId);
  drag = { start: pt, ox: state.panels[i].ox, oy: state.panels[i].oy };
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const p = state.panels[state.selected];
  const panels = layoutPanels(state.layout, preview.width, preview.height);
  const panel = panels[state.selected];
  const spanX = Math.max(1, panel.w * (p.zoom - 1) * 2);
  const spanY = Math.max(1, panel.h * (p.zoom - 1) * 2);
  p.ox = Math.max(-1, Math.min(1, drag.ox + ((pt.x - drag.start.x) / spanX) * 2));
  p.oy = Math.max(-1, Math.min(1, drag.oy + ((pt.y - drag.start.y) / spanY) * 2));
  draw();
});
preview.addEventListener('pointerup', () => { drag = null; });
preview.addEventListener('pointercancel', () => { drag = null; });

// ------------------------------------------------------------ shot scenes
async function runShotScene(name) {
  const scene = SHOT_SCENES[name];
  if (!scene) {
    document.body.textContent = `Unknown shot: ${name}`;
    window.__shotReady = true;
    return;
  }
  await loadSamples();
  Object.assign(state, {
    layout: scene.layout,
    grade: scene.grade,
    fill: scene.fill,
    caption: scene.caption,
    kicker: scene.kicker,
    texture: scene.texture,
  });
  state.panels = scenePanels(scene, layoutPanels(scene.layout, 100, 100).length);
  state.selected = 0;

  if (name === 'editor') {
    // show the full editor with the scene applied
    $('layout').value = scene.layout;
    $('grade').value = scene.grade;
    $('fill').value = scene.fill;
    $('caption').value = scene.caption;
    $('kicker').value = scene.kicker;
    $('size').value = 'Wide 1920 × 1080';
    state.sizeName = 'Wide 1920 × 1080';
    rebuildLibrary();
    draw();
  } else {
    // lone exported cover at the export's proportions
    $('editor').hidden = true;
    document.querySelector('.masthead').hidden = true;
    shotStage.hidden = false;
    const [w, h] = scene.size;
    shotCanvas.width = w;
    shotCanvas.height = h;
    const coverState = { ...state, sizeName: 'Wide 1920 × 1080' };
    renderCover(shotCanvas, coverState);
  }

  try {
    await document.fonts.load('16px "Archivo Black"');
    await document.fonts.ready;
  } catch { /* fall back to system font */ }
  // fonts may change lettering metrics: paint once more after they arrive
  if (name === 'editor') draw();
  else {
    const [w, h] = scene.size;
    shotCanvas.width = w;
    shotCanvas.height = h;
    renderCover(shotCanvas, { ...state });
  }
  window.__shotReady = true;
}

// ------------------------------------------------------------ boot
const shotName = new URLSearchParams(location.search).get('shot');
wireControls();
if (shotName) {
  runShotScene(shotName);
} else {
  loadSamples().then(() => {
    syncZoom();
  });
}
