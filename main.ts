// Poster Ink Cover Studio — a make.fun gta6-cover-art-01 entry (Node 22,
// standard library only). The app is this directory's app/ folder: plain
// static files a desktop browser loads offline (app/index.html and its ES
// modules, no library and no network request), and this program hands it in.
// It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// What the app builds: a multi-panel GTA-style poster cover maker — 8 named
// layouts (Hero + Four, Grid Four, Slanted Six, Full Bleed, Duo Split,
// Triple Strip, Cover Story, Five Panel), 6 painted per-pixel grades (Vice
// Sunset, Neon Nights, Leonida Gold, Palm Dusk, Midnight Neon, Print Poster)
// with halftone print texture and grain, two-tone gradient poster lettering
// in a shipped OFL display face, drag/zoom per panel, one-photo-sliced mode,
// and one-click PNG export in 1080x1080, 1080x1350 and 1920x1080. The
// screenshots in screenshots/ are real renders of that app (three exported
// covers, one editor view), retaken with `node shots.mjs`.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Build summary on stderr only — dossier.json is untouched by this line, so
// the grader's byte-for-byte check still holds.
console.error(
  'poster-ink: dossier written — 8 layouts, 6 grades, 3 export sizes, '
  + '4 screenshots (3 exported covers + editor)',
);
