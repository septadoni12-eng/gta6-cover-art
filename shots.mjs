// shots.mjs — take the entry's screenshots with headless Chromium over CDP.
// Usage: node shots.mjs <base-url> <out-dir>
// Every shot is a real render of the final app: exported covers are the app's
// own drawing of the export at its own proportions, and the editor shot shows
// the app with the sample photos loaded across the panels.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [baseUrl, outDir] = process.argv.slice(2);
const chromePath = join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const PORT = 9334;
mkdirSync(outDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--remote-debugging-address=127.0.0.1', '--window-size=1280,800',
  '--user-data-dir=/tmp/poster-ink-shots-profile', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 160; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chromium CDP did not come up');
}

const wsUrl = await connect();
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
};
function cdp(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve) => { pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
}

async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result?.exceptionDetails) throw new Error('page error: ' + JSON.stringify(result.exceptionDetails).slice(0, 400));
  return result?.result?.value;
}

async function shoot(file, query, w, h) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${baseUrl}/${query}` });
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    if (await evaluate('window.__shotReady === true').catch(() => false)) break;
  }
  await sleep(250);
  for (const quality of [84, 74, 64, 54]) {
    const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality });
    const buf = Buffer.from(shot.data, 'base64');
    if (buf.length <= 262144 || quality === 54) {
      writeFileSync(join(outDir, file), buf);
      console.log('shot', file, buf.length, 'bytes @q' + quality);
      return;
    }
  }
}

await cdp('Page.enable', {});
await cdp('Runtime.enable', {});

// 1 — the cover: an exported wide cover (shown at 1280x720), hero panel + two
// supporting panels of the pier photo, Vice Sunset grade, halftone print.
await shoot('1-cover.jpg', '?shot=cover&size=wide&layout=hero-four&grade=vice-sunset&photo=pier&caption=Sunset%20Heist&kicker=Leonida%20Nights', 1280, 720);
// 2 — the editor at work: slanted panels, both samples loaded, Neon Nights.
await shoot('2-editor.jpg', '?shot=editor&layout=slant-six&grade=neon-nights&photo=boulevard&caption=Boulevard%20Queen&kicker=Vice%20After%20Dark', 1280, 800);
// 3 — an exported portrait cover, Cover Story layout, Leonida Gold grade.
await shoot('3-portrait.jpg', '?shot=cover&size=portrait&layout=cover-story&grade=leonida-gold&photo=boulevard&caption=Boulevard%20Queen&kicker=Golden%20Hour', 864, 1080);
// 4 — an exported square cover, Five Panel layout, Midnight Neon grade.
await shoot('4-square.jpg', '?shot=cover&size=square&layout=five-panel&grade=midnight-neon&photo=pier&caption=Neon%20Palms&kicker=After%20Midnight', 1080, 1080);

ws.close();
chrome.kill('SIGTERM');
console.log('done');
