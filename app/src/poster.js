// Poster Ink — cover renderer.
//
// This module knows nothing about the DOM editor. It takes a plain state
// object (layout name, grade name, panel photos, caption) and paints a
// complete GTA-style multi-panel poster onto any 2d canvas. The editor in
// main.js and the screenshot scenes in shots.js both call renderCover().
//
// Pipeline per cover:
//   1. cream poster board
//   2. each panel: photo cover-fit (with per-panel zoom + pan), clipped to
//      the panel shape (rectangles, or slanted parallelograms)
//   3. per-pixel grade: saturation / contrast curve + duotone shadows and
//      highlights, so any photo lands in the same painted world
//   4. gradient sky wash, halftone dots, print grain, soft vignette
//   5. bottom scrim + poster lettering (kicker + caption, gradient fill,
//      hard offset shadow, dark outline, auto-fit to two lines max)

export const CREAM = '#f6ead6';
export const INK = '#1d0b2e';

// ---------------------------------------------------------------- grades
// sat: saturation multiplier. contrast: pivot-0.5 contrast. shadow/highlight:
// duotone tint colours mixed in by luminance. wash: a vertical gradient laid
// over the top of every panel (sky light). halftone: dot strength.
export const GRADES = {
  'Vice Sunset': {
    sat: 1.35, contrast: 1.12, bright: 1.04,
    shadow: [43, 24, 56], highlight: [255, 194, 75],
    washTop: 'rgba(255,46,136,0.20)', washBottom: 'rgba(255,120,71,0.05)',
    halftone: 0.10, grain: 0.05,
  },
  'Neon Nights': {
    sat: 1.5, contrast: 1.18, bright: 1.0,
    shadow: [16, 8, 54], highlight: [41, 230, 255],
    washTop: 'rgba(41,230,255,0.16)', washBottom: 'rgba(255,46,136,0.14)',
    halftone: 0.12, grain: 0.06,
  },
  'Leonida Gold': {
    sat: 1.25, contrast: 1.08, bright: 1.07,
    shadow: [74, 40, 16], highlight: [255, 214, 110],
    washTop: 'rgba(255,194,75,0.22)', washBottom: 'rgba(255,120,71,0.04)',
    halftone: 0.08, grain: 0.05,
  },
  'Palm Dusk': {
    sat: 1.3, contrast: 1.1, bright: 0.98,
    shadow: [30, 32, 66], highlight: [255, 150, 90],
    washTop: 'rgba(255,120,71,0.14)', washBottom: 'rgba(14,127,134,0.10)',
    halftone: 0.09, grain: 0.06,
  },
  'Midnight Neon': {
    sat: 1.55, contrast: 1.22, bright: 0.96,
    shadow: [10, 6, 40], highlight: [120, 90, 255],
    washTop: 'rgba(41,230,255,0.12)', washBottom: 'rgba(120,60,255,0.18)',
    halftone: 0.13, grain: 0.07,
  },
  'Print Poster': {
    sat: 1.15, contrast: 1.28, bright: 1.02,
    shadow: [26, 18, 20], highlight: [255, 226, 160],
    washTop: 'rgba(255,194,75,0.10)', washBottom: 'rgba(255,46,136,0.06)',
    halftone: 0.18, grain: 0.09,
  },
};

export const GRADE_NAMES = Object.keys(GRADES);

// ---------------------------------------------------------------- layouts
// Every layout is a function of (W, H, gap) returning panel rects.
// A rect may carry `skew` (horizontal shift of the top edge, in px) which
// turns it into a slanted parallelogram — the Slanted Six signature.
function rect(x, y, w, h, skew = 0) {
  return { x, y, w, h, skew };
}

export const LAYOUTS = {
  'Hero + Four'(W, H, g) {
    const heroW = W * 0.56;
    const sideX = heroW + g;
    const sideW = W - sideX;
    const cw = (sideW - g) / 2;
    const ch = (H - g) / 2;
    return [
      rect(0, 0, heroW, H),
      rect(sideX, 0, cw, ch),
      rect(sideX + cw + g, 0, cw, ch),
      rect(sideX, ch + g, cw, ch),
      rect(sideX + cw + g, ch + g, cw, ch),
    ];
  },
  'Grid Four'(W, H, g) {
    const cw = (W - g) / 2, ch = (H - g) / 2;
    return [
      rect(0, 0, cw, ch), rect(cw + g, 0, cw, ch),
      rect(0, ch + g, cw, ch), rect(cw + g, ch + g, cw, ch),
    ];
  },
  'Slanted Six'(W, H, g) {
    const skew = W * 0.045;
    const rowH = (H - g) / 2;
    const cw = (W - 2 * g) / 3;
    const out = [];
    for (let i = 0; i < 3; i++) out.push(rect(i * (cw + g), 0, cw, rowH, skew));
    for (let i = 0; i < 3; i++) out.push(rect(i * (cw + g), rowH + g, cw, rowH, -skew));
    return out;
  },
  'Full Bleed'(W, H) {
    return [rect(0, 0, W, H)];
  },
  'Duo Split'(W, H, g) {
    const cw = (W - g) / 2;
    return [rect(0, 0, cw, H), rect(cw + g, 0, cw, H)];
  },
  'Triple Strip'(W, H, g) {
    const cw = (W - 2 * g) / 3;
    return [
      rect(0, 0, cw, H), rect(cw + g, 0, cw, H), rect(2 * (cw + g), 0, cw, H),
    ];
  },
  'Cover Story'(W, H, g) {
    const topH = H * 0.64;
    const botY = topH + g;
    const botH = H - botY;
    const cw = (W - 2 * g) / 3;
    return [
      rect(0, 0, W, topH),
      rect(0, botY, cw, botH),
      rect(cw + g, botY, cw, botH),
      rect(2 * (cw + g), botY, cw, botH),
    ];
  },
  'Five Panel'(W, H, g) {
    const topH = H * 0.52;
    const botY = topH + g;
    const botH = H - botY;
    const topW = (W - 2 * g) / 3;
    const botW = (W - g) / 2;
    return [
      rect(0, 0, topW, topH),
      rect(topW + g, 0, topW, topH),
      rect(2 * (topW + g), 0, topW, topH),
      rect(0, botY, botW, botH),
      rect(botW + g, botY, botW, botH),
    ];
  },
};

export const LAYOUT_NAMES = Object.keys(LAYOUTS);

export const POST_SIZES = {
  'Square 1080 × 1080': [1080, 1080],
  'Portrait 1080 × 1350': [1080, 1350],
  'Wide 1920 × 1080': [1920, 1080],
};

// ------------------------------------------------------------ panel shapes
function panelPath(ctx, p) {
  ctx.beginPath();
  if (p.skew) {
    ctx.moveTo(p.x + p.skew, p.y);
    ctx.lineTo(p.x + p.w + p.skew, p.y);
    ctx.lineTo(p.x + p.w - p.skew, p.y + p.h);
    ctx.lineTo(p.x - p.skew, p.y + p.h);
  } else {
    ctx.rect(p.x, p.y, p.w, p.h);
  }
  ctx.closePath();
}

// ------------------------------------------------------------ per-pixel grade
function gradeImageData(data, grade) {
  const { sat, contrast, bright, shadow, highlight } = grade;
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    // contrast around mid grey, then brightness
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    // saturation
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;
    // duotone: shadows lean to the shadow colour, highlights to the highlight
    const l = Math.max(0, Math.min(1, lum / 255));
    const shAmt = (1 - l) * 0.38;
    const hiAmt = l * l * 0.30;
    r = r * (1 - shAmt - hiAmt) + shadow[0] * shAmt + highlight[0] * hiAmt;
    g = g * (1 - shAmt - hiAmt) + shadow[1] * shAmt + highlight[1] * hiAmt;
    b = b * (1 - shAmt - hiAmt) + shadow[2] * shAmt + highlight[2] * hiAmt;
    d[i] = Math.max(0, Math.min(255, r * bright));
    d[i + 1] = Math.max(0, Math.min(255, g * bright));
    d[i + 2] = Math.max(0, Math.min(255, b * bright));
  }
}

// Draw one photo into a panel rect, cover-fit, with zoom + pan offsets
// (ox, oy in -1..1 fractions of the overflow), then grade it in place.
function paintPanel(ctx, img, p, panelState, grade) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = panelState?.zoom ?? 1;
  const ox = panelState?.ox ?? 0;
  const oy = panelState?.oy ?? 0;

  // offscreen at panel resolution (capped so huge exports stay fast)
  const scale = Math.min(1, 900 / Math.max(p.w, p.h));
  const pw = Math.max(2, Math.round(p.w * scale));
  const ph = Math.max(2, Math.round(p.h * scale));
  const off = document.createElement('canvas');
  off.width = pw; off.height = ph;
  const octx = off.getContext('2d');

  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base, dh = ih * base;
  const dx = (pw - dw) / 2 + ox * Math.max(0, (dw - pw) / 2);
  const dy = (ph - dh) / 2 + oy * Math.max(0, (dh - ph) / 2);
  octx.drawImage(img, dx, dy, dw, dh);

  const imgData = octx.getImageData(0, 0, pw, ph);
  gradeImageData(imgData, grade);
  octx.putImageData(imgData, 0, 0);

  ctx.save();
  panelPath(ctx, p);
  ctx.clip();
  ctx.drawImage(off, p.x, p.y, p.w, p.h);
  // sky wash: warm light falling from the top of the panel
  const wash = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.restore();
}

// ------------------------------------------------------------ print texture
let dotPattern = null;
function halftoneLayer(ctx, W, H, strength) {
  if (!dotPattern) {
    const tile = document.createElement('canvas');
    tile.width = 14; tile.height = 14;
    const t = tile.getContext('2d');
    t.fillStyle = '#1d0b2e';
    t.beginPath(); t.arc(7, 7, 2.1, 0, Math.PI * 2); t.fill();
    dotPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.fillStyle = dotPattern;
  // dots heaviest in the top strip (the "printed sky"), fading down
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = dotPattern;
  ctx.fillRect(0, 0, W, H * 0.45);
  ctx.restore();
}

let grainTile = null;
function grainLayer(ctx, W, H, strength) {
  if (!grainTile) {
    const tile = document.createElement('canvas');
    tile.width = 160; tile.height = 160;
    const t = tile.getContext('2d');
    const id = t.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() * 255;
      id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 28;
    }
    t.putImageData(id, 0, 0);
    grainTile = tile;
  }
  ctx.save();
  ctx.globalAlpha = strength * 2.2;
  const pat = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------ lettering
function fitLines(ctx, text, maxWidth, startSize) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  let size = startSize;
  for (;;) {
    ctx.font = `${size}px "Archivo Black", "Arial Black", sans-serif`;
    const lines = [];
    let line = '';
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    if ((lines.length <= 2 || size <= 18) && Math.max(...lines.map((l) => ctx.measureText(l).width)) <= maxWidth) {
      return { lines, size };
    }
    size = Math.floor(size * 0.92);
  }
}

function drawLettering(ctx, W, H, caption, kicker) {
  const bandTop = H * 0.62;
  // scrim so the caption reads over any photo
  const scrim = ctx.createLinearGradient(0, bandTop, 0, H);
  scrim.addColorStop(0, 'rgba(29,11,46,0)');
  scrim.addColorStop(0.45, 'rgba(29,11,46,0.42)');
  scrim.addColorStop(1, 'rgba(29,11,46,0.66)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandTop, W, H - bandTop);

  const cx = W / 2;
  const maxW = W * 0.92;

  // Fit the caption first, then anchor its block: the last line's baseline
  // sits just above the bottom edge, and the kicker hangs above the top of
  // the first line — so a two-line caption can never swallow the kicker.
  let lines = [];
  let size = 0;
  let lineH = 0;
  if (caption && caption.trim()) {
    ({ lines, size } = fitLines(ctx, caption, maxW, Math.round(H * 0.17)));
    lineH = size * 1.02;
  }
  const blockBottom = H * 0.92; // baseline of the last caption line — leaves
  // room below it for the outline stroke, the hard shadow and descenders
  // (a Q tail) so no line is ever clipped by the cover's bottom edge
  const firstBaseline = blockBottom - (lines.length - 1) * lineH;

  if (kicker && kicker.trim()) {
    const kSize = Math.max(14, Math.round(H * 0.032));
    const capTop = firstBaseline - size * 0.72;
    const ky = capTop - kSize * 0.5;
    ctx.font = `${kSize}px "Archivo Black", "Arial Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(kSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = Math.max(3, kSize * 0.22);
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.strokeText(kicker.toUpperCase(), cx, ky);
    ctx.fillStyle = '#ffc24b';
    ctx.fillText(kicker.toUpperCase(), cx, ky);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  if (lines.length) {
    let lineY = firstBaseline;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    const grad = ctx.createLinearGradient(0, firstBaseline - size, 0, firstBaseline + size * 0.4);
    grad.addColorStop(0, '#fff3c4');
    grad.addColorStop(0.45, '#ffc24b');
    grad.addColorStop(0.75, '#ff7847');
    grad.addColorStop(1, '#ff2e88');
    const shadowOff = Math.max(3, Math.round(size * 0.055));
    for (const line of lines) {
      ctx.font = `${size}px "Archivo Black", "Arial Black", sans-serif`;
      // hard offset shadow
      ctx.fillStyle = INK;
      ctx.fillText(line, cx + shadowOff, lineY + shadowOff);
      // dark outline
      ctx.lineWidth = Math.max(4, size * 0.16);
      ctx.strokeStyle = INK;
      ctx.strokeText(line, cx, lineY);
      // two-tone gradient fill
      ctx.fillStyle = grad;
      ctx.fillText(line, cx, lineY);
      lineY += lineH;
    }
  }
}

// ------------------------------------------------------------ main entry
// state: {
//   layout, grade, fill ('per-panel' | 'sliced' | 'one'),
//   photos: HTMLImageElement[],           // the library, in order
//   panels: [{ photo, zoom, ox, oy }],   // per-panel assignment (photo = index)
//   caption, kicker, texture (0..1)
// }
export function renderCover(canvas, state) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES['Vice Sunset'];
  const gap = Math.max(6, Math.round(Math.min(W, H) * 0.012));

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  const panels = LAYOUTS[state.layout](W, H, gap);
  const texture = state.texture ?? 1;

  if (state.fill === 'sliced' && state.photos.length) {
    // one photo sliced across every panel: paint it once, cover-fit over the
    // union of all panels, then cut the panels out of that single painting.
    const img = state.photos[state.panels[0]?.photo ?? 0] || state.photos[0];
    const minX = Math.min(...panels.map((p) => p.x));
    const minY = Math.min(...panels.map((p) => p.y));
    const maxX = Math.max(...panels.map((p) => p.x + p.w));
    const maxY = Math.max(...panels.map((p) => p.y + p.h));
    const layer = document.createElement('canvas');
    layer.width = W; layer.height = H;
    const lctx = layer.getContext('2d');
    const uw = maxX - minX, uh = maxY - minY;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const base = Math.max(uw / iw, uh / ih);
    lctx.drawImage(img, minX + (uw - iw * base) / 2, minY + (uh - ih * base) / 2, iw * base, ih * base);
    const id = lctx.getImageData(0, 0, W, H);
    gradeImageData(id, grade);
    lctx.putImageData(id, 0, 0);
    for (const p of panels) {
      ctx.save();
      panelPath(ctx, p);
      ctx.clip();
      ctx.drawImage(layer, 0, 0);
      const wash = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      wash.addColorStop(0, grade.washTop);
      wash.addColorStop(1, grade.washBottom);
      ctx.fillStyle = wash;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    }
  } else {
    panels.forEach((p, i) => {
      const ps = state.panels[i] || { photo: i % Math.max(1, state.photos.length), zoom: 1, ox: 0, oy: 0 };
      const img = state.fill === 'one'
        ? (state.photos[state.panels[0]?.photo ?? 0] || state.photos[0])
        : state.photos[ps.photo];
      if (!img) {
        // empty panel: flat painted placeholder so the grid still reads
        ctx.save();
        panelPath(ctx, p);
        ctx.clip();
        const g2 = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        g2.addColorStop(0, '#ff7847');
        g2.addColorStop(1, '#2b1838');
        ctx.fillStyle = g2;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.restore();
        return;
      }
      paintPanel(ctx, img, p, ps, grade);
    });
  }

  // print texture over the whole poster
  halftoneLayer(ctx, W, H, grade.halftone * texture);
  grainLayer(ctx, W, H, grade.grain * texture);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(29,11,46,0)');
  vig.addColorStop(1, 'rgba(29,11,46,0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  drawLettering(ctx, W, H, state.caption, state.kicker);
  return panels;
}

// Panel rects for a given cover size (used by the editor for hit-testing).
export function layoutPanels(layout, W, H) {
  const gap = Math.max(6, Math.round(Math.min(W, H) * 0.012));
  return LAYOUTS[layout](W, H, gap);
}
