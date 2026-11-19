// Poster Ink renderer: draws the multi-panel GTA-style cover onto any canvas.
//
// A cover is a collage of panels cut from one photo (sliced mode) or filled with
// several photos (multi mode), every panel painted with the chosen colour grade
// (a per-pixel duotone/curve pass, then a gradient sky wash, halftone dots and
// print grain), the panels divided by clean poster-white gaps, and the caption
// lettered across the foot in a heavy display face with a two-tone gradient
// fill, a hard offset shadow and a dark outline — the poster formula, in our
// own design and our own licensed font. Nothing here is Rockstar artwork.

/** The eight panel layouts. Each returns panel rectangles as fractions of the
 *  cover (x, y, w, h), hero panel first. `slant` shears a panel's right edge. */
export const LAYOUTS = [
  { id: 'hero-four', name: 'Hero + Four', panels: [
    { x: 0.00, y: 0.00, w: 0.62, h: 1.00 },
    { x: 0.64, y: 0.00, w: 0.36, h: 0.49 },
    { x: 0.64, y: 0.51, w: 0.36, h: 0.49 },
  ] },
  { id: 'grid-four', name: 'Grid Four', panels: [
    { x: 0.00, y: 0.00, w: 0.49, h: 0.49 },
    { x: 0.51, y: 0.00, w: 0.49, h: 0.49 },
    { x: 0.00, y: 0.51, w: 0.49, h: 0.49 },
    { x: 0.51, y: 0.51, w: 0.49, h: 0.49 },
  ] },
  { id: 'slant-six', name: 'Slanted Six', panels: [
    { x: 0.00, y: 0.00, w: 0.52, h: 0.58, slant: 0.10 },
    { x: 0.50, y: 0.00, w: 0.50, h: 0.58, slant: 0.10 },
    { x: 0.00, y: 0.60, w: 0.34, h: 0.40, slant: 0.08 },
    { x: 0.33, y: 0.60, w: 0.34, h: 0.40, slant: 0.08 },
    { x: 0.66, y: 0.60, w: 0.34, h: 0.40, slant: 0.08 },
  ] },
  { id: 'full-bleed', name: 'Full Bleed', panels: [
    { x: 0.00, y: 0.00, w: 1.00, h: 1.00 },
  ] },
  { id: 'duo-split', name: 'Duo Split', panels: [
    { x: 0.00, y: 0.00, w: 0.49, h: 1.00 },
    { x: 0.51, y: 0.00, w: 0.49, h: 1.00 },
  ] },
  { id: 'triple-strip', name: 'Triple Strip', panels: [
    { x: 0.00, y: 0.00, w: 0.32, h: 1.00 },
    { x: 0.34, y: 0.00, w: 0.32, h: 1.00 },
    { x: 0.68, y: 0.00, w: 0.32, h: 1.00 },
  ] },
  { id: 'cover-story', name: 'Cover Story', panels: [
    { x: 0.00, y: 0.00, w: 1.00, h: 0.62 },
    { x: 0.00, y: 0.64, w: 0.32, h: 0.36 },
    { x: 0.34, y: 0.64, w: 0.32, h: 0.36 },
    { x: 0.68, y: 0.64, w: 0.32, h: 0.36 },
  ] },
  { id: 'five-panel', name: 'Five Panel', panels: [
    { x: 0.00, y: 0.00, w: 0.33, h: 0.49 },
    { x: 0.335, y: 0.00, w: 0.33, h: 0.49 },
    { x: 0.67, y: 0.00, w: 0.33, h: 0.49 },
    { x: 0.00, y: 0.51, w: 0.49, h: 0.49 },
    { x: 0.51, y: 0.51, w: 0.49, h: 0.49 },
  ] },
];

/** The six colour grades: duotone shadow/highlight anchors, a saturation and
 *  contrast pass, and the sky-wash colours laid over the top of every panel. */
export const GRADES = [
  { id: 'vice-sunset', name: 'Vice Sunset', shadow: [38, 12, 62], high: [255, 178, 105], sat: 1.28, con: 1.12, wash: ['rgba(255,46,136,0.20)', 'rgba(255,120,71,0.26)'] },
  { id: 'neon-nights', name: 'Neon Nights', shadow: [8, 10, 44], high: [120, 235, 255], sat: 1.35, con: 1.16, wash: ['rgba(41,230,255,0.14)', 'rgba(255,46,160,0.24)'] },
  { id: 'leonida-gold', name: 'Leonida Gold', shadow: [52, 26, 8], high: [255, 214, 120], sat: 1.18, con: 1.08, wash: ['rgba(255,194,75,0.16)', 'rgba(255,110,60,0.20)'] },
  { id: 'palm-dusk', name: 'Palm Dusk', shadow: [10, 40, 44], high: [255, 160, 120], sat: 1.12, con: 1.10, wash: ['rgba(14,127,134,0.16)', 'rgba(255,90,90,0.20)'] },
  { id: 'midnight-neon', name: 'Midnight Neon', shadow: [4, 4, 18], high: [190, 140, 255], sat: 1.30, con: 1.22, wash: ['rgba(90,40,200,0.18)', 'rgba(255,46,136,0.16)'] },
  { id: 'print-poster', name: 'Print Poster', shadow: [30, 20, 40], high: [255, 226, 170], sat: 0.94, con: 1.18, wash: ['rgba(255,90,60,0.10)', 'rgba(255,180,60,0.14)'] },
];

const scratch = document.createElement('canvas');

/** Builds a 256-step lookup table for one grade: contrast, saturation is
 *  applied per-pixel later; the table carries the duotone map per channel. */
function gradeTable(grade) {
  const tables = [[], [], []];
  for (let i = 0; i < 256; i++) {
    let v = (i / 255 - 0.5) * grade.con + 0.5;
    v = Math.min(1, Math.max(0, v));
    for (let c = 0; c < 3; c++) {
      const mapped = grade.shadow[c] + (grade.high[c] - grade.shadow[c]) * v;
      tables[c][i] = Math.round(i * 0.45 + mapped * 0.55);
    }
  }
  return tables;
}

/** Paints one photo into a panel rectangle of `ctx`, cover-fitted with the
 *  panel's zoom and drag offsets, then graded per-pixel on a scratch canvas. */
function paintPanel(ctx, img, rect, view, grade, tables) {
  const { x, y, w, h } = rect;
  scratch.width = Math.max(2, Math.round(w));
  scratch.height = Math.max(2, Math.round(h));
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (view?.zoom ?? 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ox = (view?.ox ?? 0) * w * 0.4;
  const oy = (view?.oy ?? 0) * h * 0.4;
  sctx.drawImage(img, (w - pw) / 2 + ox, (h - ph) / 2 + oy, pw, ph);
  const data = sctx.getImageData(0, 0, scratch.width, scratch.height);
  const px = data.data;
  const [tr, tg, tb] = tables;
  const sat = grade.sat;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2];
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    r = grey + (r - grey) * sat;
    g = grey + (g - grey) * sat;
    b = grey + (b - grey) * sat;
    px[i] = tr[Math.min(255, Math.max(0, Math.round(r)))];
    px[i + 1] = tg[Math.min(255, Math.max(0, Math.round(g)))];
    px[i + 2] = tb[Math.min(255, Math.max(0, Math.round(b)))];
  }
  sctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.beginPath();
  if (rect.slantPx) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - rect.slantPx, y + h);
    ctx.lineTo(x - rect.slantPx, y + h);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  ctx.drawImage(scratch, x, y);
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(x - (rect.slantPx ?? 0), y, w + (rect.slantPx ?? 0) * 2, h);
  ctx.restore();
}

/** Halftone dots and print grain over the whole cover: the printed-poster
 *  texture that reads even at thumbnail size. Deterministic (seeded) so two
 *  runs of the program write the same bytes. */
function printTexture(ctx, w, h, strength) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  const step = Math.max(6, Math.round(w / 160));
  for (let yy = step / 2; yy < h; yy += step) {
    for (let xx = step / 2; xx < w; xx += step) {
      const r = (step * 0.16) * (0.5 + 0.5 * Math.sin(xx * 0.011 + yy * 0.017));
      ctx.beginPath();
      ctx.arc(xx, yy, Math.max(0.6, r * strength), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  let seed = 1234567;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  const dots = Math.round(w * h / 2600);
  for (let i = 0; i < dots; i++) ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  ctx.restore();
}

/** Letters the caption: heavy display capitals, auto-fitted to at most two
 *  lines, gradient-filled with a hard offset shadow and a dark outline. */
function letterCaption(ctx, w, h, caption, kicker) {
  const text = (caption ?? '').trim().toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fontFor = (size) => `400 ${size}px "Archivo Black", "Arial Black", sans-serif`;
  if (!text && !kicker?.trim()) { ctx.restore(); return; }
  const words = text.split(/\s+/);
  let lines = [text];
  if (words.length > 1 && ctx.measureText(text).width > 0) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const score = Math.abs(a.length - b.length);
      if (!best || score < best.score) best = { lines: [a, b], score };
    }
    let size = h * 0.16;
    ctx.font = fontFor(size);
    const widest = Math.max(...best.lines.map((l) => ctx.measureText(l).width));
    if (widest <= w * 0.92) lines = best.lines;
  }
  let size = (lines.length === 2 ? h * 0.135 : h * 0.165);
  ctx.font = fontFor(size);
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (widest() > w * 0.92 && size > 12) { size -= 2; ctx.font = fontFor(size); }
  const lineH = size * 1.04;
  const base = h * 0.965;
  if (kicker?.trim()) {
    let ks = h * 0.034;
    ctx.font = fontFor(ks);
    while (ctx.measureText(kicker.trim().toUpperCase()).width > w * 0.86 && ks > 10) { ks -= 1; ctx.font = fontFor(ks); }
    ctx.lineWidth = ks * 0.22;
    ctx.strokeStyle = 'rgba(20,6,30,0.9)';
    ctx.fillStyle = '#ffd23e';
    const ky = base - lines.length * lineH - ks * 0.55;
    ctx.strokeText(kicker.trim().toUpperCase(), w / 2, ky);
    ctx.fillText(kicker.trim().toUpperCase(), w / 2, ky);
    ctx.font = fontFor(size);
  }
  lines.forEach((line, i) => {
    const ly = base - (lines.length - 1 - i) * lineH;
    const grad = ctx.createLinearGradient(0, ly - size, 0, ly);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#ffe9a8');
    grad.addColorStop(1, '#ff7847');
    ctx.lineWidth = size * 0.16;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c0b2e';
    ctx.fillStyle = 'rgba(255,46,136,0.85)';
    ctx.fillText(line, w / 2 + size * 0.045, ly + size * 0.05);
    ctx.strokeText(line, w / 2, ly);
    ctx.fillStyle = grad;
    ctx.fillText(line, w / 2, ly);
  });
  ctx.restore();
}

/** Draws the whole cover onto `canvas` at the canvas's own size.
 *  state: { layout, grade, caption, kicker, texture (0..1),
 *           panels: [{ img, ox, oy, zoom }] } — in sliced mode every panel
 *  uses panels[0]'s photo and view. */
export function drawPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = LAYOUTS.find((l) => l.id === state.layout) ?? LAYOUTS[0];
  const grade = GRADES.find((g) => g.id === state.grade) ?? GRADES[0];
  const tables = gradeTable(grade);
  ctx.fillStyle = '#fdf7ec';
  ctx.fillRect(0, 0, w, h);
  const gap = Math.max(6, Math.round(w * 0.012));
  layout.panels.forEach((p, i) => {
    const entry = state.mode === 'sliced' ? state.panels[0] : (state.panels[i] ?? state.panels[0]);
    if (!entry?.img) return;
    const rect = {
      x: p.x * w + gap, y: p.y * h + gap,
      w: p.w * w - gap * 2, h: p.h * h - gap * 2,
      slantPx: p.slant ? p.slant * w * 0.4 : 0,
    };
    if (state.mode === 'sliced') {
      const full = { x: rect.x - p.x * w, y: rect.y - p.y * h, w, h };
      paintPanelWindow(ctx, entry, p, full, rect, grade, tables);
    } else {
      paintPanel(ctx, entry.img, rect, entry, grade, tables);
    }
  });
  printTexture(ctx, w, h, state.texture ?? 0.8);
  const shade = ctx.createLinearGradient(0, h * 0.55, 0, h);
  shade.addColorStop(0, 'rgba(20,4,36,0)');
  shade.addColorStop(1, 'rgba(20,4,36,0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  letterCaption(ctx, w, h, state.caption, state.kicker);
}

/** Sliced mode: the panel shows its window of one cover-sized photo, so the
 *  collage reads as one scene cut by poster dividers. */
function paintPanelWindow(ctx, entry, frac, full, rect, grade, tables) {
  const img = entry.img;
  const scale = Math.max(full.w / img.naturalWidth, full.h / img.naturalHeight) * (entry.zoom ?? 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ox = (entry.ox ?? 0) * full.w * 0.4;
  const oy = (entry.oy ?? 0) * full.h * 0.4;
  scratch.width = Math.max(2, Math.round(rect.w));
  scratch.height = Math.max(2, Math.round(rect.h));
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  const dx = (full.w - pw) / 2 + ox - frac.x * full.w + (rect.x - (full.x + frac.x * full.w));
  const dy = (full.h - ph) / 2 + oy - frac.y * full.h + (rect.y - (full.y + frac.y * full.h));
  sctx.drawImage(img, dx, dy, pw, ph);
  const data = sctx.getImageData(0, 0, scratch.width, scratch.height);
  const px = data.data;
  const [tr, tg, tb] = tables;
  const sat = grade.sat;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2];
    const grey = 0.299 * r + 0.587 * g + 0.114 * b;
    r = grey + (r - grey) * sat;
    g = grey + (g - grey) * sat;
    b = grey + (b - grey) * sat;
    px[i] = tr[Math.min(255, Math.max(0, Math.round(r)))];
    px[i + 1] = tg[Math.min(255, Math.max(0, Math.round(g)))];
    px[i + 2] = tb[Math.min(255, Math.max(0, Math.round(b)))];
  }
  sctx.putImageData(data, 0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(scratch, rect.x, rect.y);
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}
