# Poster Ink Cover Studio — GTA-Style Multi-Panel Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/septadoni12-eng/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/septadoni12-eng/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into cover art in the multi-panel GTA poster style: a collage of painted panels divided by poster-white gaps, a Vice City sunset or neon colour grade over every panel, halftone print texture, and bold two-tone display lettering across the foot — exported as a PNG to share. Everything is our own design: no Rockstar Games logo, artwork or font anywhere; the display face is Archivo Black, shipped under the SIL Open Font License (see `app/fonts/OFL.txt`).

What it does:

- **8 named layouts** — Hero + Four, Grid Four, Slanted Six, Full Bleed, Duo Split, Triple Strip, Cover Story, Five Panel.
- **Two ways to fill them** — a different photo per panel from your photo library (click a panel, click a photo), or one photo sliced across every panel as a single scene.
- **Positioning per panel** — drag the photo on the live preview, zoom each panel independently.
- **6 colour grades** — Vice Sunset, Neon Nights, Leonida Gold, Palm Dusk, Midnight Neon, Print Poster — each a real per-pixel duotone/curve grade with a gradient sky wash, plus halftone dots and print grain with an adjustable texture strength.
- **Poster-formula lettering** — an editable caption and kicker line, auto-fitted to one or two lines, gradient-filled with a hard offset shadow and a dark outline.
- **One-click PNG export** in the three common post sizes: 1080 × 1080, 1080 × 1350 and 1920 × 1080.
- **Fully offline** — static files only; photos are read on your own machine and never uploaded. Two built-in sample photos (made for make.fun, free to use) make the first cover one click away.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser. To produce the hand-in output exactly as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/ to out/ and writes out/dossier.json
```

Screenshots are real renders of this app, taken with `node shots.mjs http://localhost:8124 screenshots` while `node serve.ts --port 8124` runs: the first is an exported wide cover, the second the editor with photos loaded, the third an exported portrait cover, the fourth an exported square cover.
