# Poster Ink — Cover Studio

Turn your photos into a multi-panel GTA-style poster cover, offline, in your
browser. No uploads, no account, no network: every file the app loads lives
under `app/`.

## What it makes

A poster in the classic cover formula: a grid of painted panels divided by
clean cream gaps, one hero panel, and huge two-tone poster lettering across
the foot. Pick any of **8 layouts** — Hero + Four, Grid Four, Slanted Six,
Full Bleed, Duo Split, Triple Strip, Cover Story, Five Panel — and one of
**6 painted grades** — Vice Sunset, Neon Nights, Leonida Gold, Palm Dusk,
Midnight Neon, Print Poster. Each grade is real per-pixel work: saturation
and contrast curves plus a duotone shadow/highlight tint, a gradient sky
wash, halftone print dots and film grain on top.

## How to use it

1. Open `app/index.html` (or serve the folder: `node serve.ts`, then
   http://localhost:8080).
2. Two sample photos are already loaded. Add your own with the file picker.
3. Click a panel on the preview, then click a photo to fill it. Drag on the
   preview to reposition the photo inside the panel; the zoom slider crops
   tighter.
4. Or use **One photo, sliced across panels** for a single image cut by the
   grid, or **One photo fills all panels**.
5. Type your caption and kicker line — the lettering auto-fits to at most
   two lines, gradient-filled with a hard offset shadow and dark outline.
6. **Export PNG** in Square 1080 × 1080, Portrait 1080 × 1350 or Wide
   1920 × 1080.

## Files

- `app/index.html` — editor shell
- `app/style.css` — dark editor styling
- `app/src/poster.js` — the cover renderer: layouts, grades, halftone,
  grain, lettering
- `app/src/main.js` — editor: library, panels, drag/zoom, export, shot modes
- `app/src/shots.js` — screenshot scene presets
- `app/fonts/ArchivoBlack-Regular.ttf` — heavy display face (SIL OFL 1.1,
  see `OFL.txt`); no Rockstar artwork or fonts are used anywhere
- `app/samples/` — two built-in sample photos, free to use

## Screenshots

`shots.mjs` retakes them with headless Chromium over CDP:

```
node shots.mjs
```

It serves the app, waits for each `?shot=` scene to paint, and captures
`1-cover.jpg` (exported wide cover), `2-editor.jpg` (the editor),
`3-portrait.jpg` (exported portrait cover) and `4-square.jpg` (exported
square cover), each at most 256 KiB.

## Build

`main.ts` (Node 22+) copies `app/` and `screenshots/` to the output
directory and writes `dossier.json` with the vendored make.fun library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
