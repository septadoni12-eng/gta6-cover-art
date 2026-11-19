// Screenshot runner for Poster Ink.
//
// Serves app/ on :8125, then drives headless Chromium over CDP: one tab per
// shot from shots.json, exact viewport per shot, waits for the page to set
// window.__shotReady, captures a JPEG, and steps the quality down
// (84, 74, 64, 54) until the file fits the 256 KiB cap. Exits non-zero if
// any shot never becomes ready or never fits.
//
// Usage: node shots.mjs
//   Reads shots.json beside this file; writes into screenshots/ beside it.
//   Needs the Chromium binary at ~/.cache/ms-playwright/chromium-1255/
//   chrome-linux64/chrome (the Playwright cache path).

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const DEBUG_PORT = 9334;
const SERVE_PORT = 8125;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`never answered: ${url}`);
}

// Minimal CDP client over Node's built-in WebSocket.
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  open() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() { this.ws.close(); }
}

async function newTab(url) {
  const res = await fetch(
    `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' },
  );
  if (!res.ok) throw new Error(`could not open tab for ${url}: HTTP ${res.status}`);
  return res.json();
}

async function shootOne(shot) {
  const tab = await newTab('about:blank');
  const cdp = new Cdp(tab.webSocketDebuggerUrl);
  await cdp.open();
  try {
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: shot.url });

    // wait for the scene to paint (fonts loaded, cover drawn)
    const deadline = Date.now() + 30000;
    for (;;) {
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: 'window.__shotReady === true',
        returnByValue: true,
      });
      if (result?.value) break;
      if (Date.now() > deadline) throw new Error(`shot ${shot.file} never became ready`);
      await sleep(200);
    }
    await sleep(300); // let the last paint settle

    for (const quality of spec.qualities) {
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg',
        quality,
      });
      const buf = Buffer.from(data, 'base64');
      if (buf.length <= spec.maxBytes) {
        const outPath = join(here, 'screenshots', shot.file);
        writeFileSync(outPath, buf);
        console.log(`${shot.file}: ${shot.width}x${shot.height}, ${buf.length} bytes, quality ${quality}`);
        return buf.length;
      }
      console.log(`${shot.file}: quality ${quality} still ${buf.length} bytes, stepping down`);
    }
    throw new Error(`shot ${shot.file} never fit under ${spec.maxBytes} bytes`);
  } finally {
    cdp.close();
    try {
      await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${tab.id}`);
    } catch { /* tab already gone */ }
  }
}

async function main() {
  mkdirSync(join(here, 'screenshots'), { recursive: true });

  // static server for app/
  const server = spawn(process.execPath, ['serve.ts', '--port', String(SERVE_PORT)], {
    cwd: here,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`[serve] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[serve] ${d}`));

  // headless Chromium with a debugging port
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--user-data-dir=/tmp/cover-shots-profile',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  chrome.stdout.on('data', (d) => process.stdout.write(`[chrome] ${d}`));
  chrome.stderr.on('data', () => { /* DevTools chatter */ });

  try {
    await waitForHttp(`http://127.0.0.1:${SERVE_PORT}/`);
    await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    for (const shot of spec.shots) await shootOne(shot);
    console.log('all shots done');
  } finally {
    chrome.kill('SIGTERM');
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
