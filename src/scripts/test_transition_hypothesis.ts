export {};

require('dotenv').config();
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

import { spawn } from 'child_process';

const BASE = 'http://127.0.0.1:3000';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function cookiesFrom(res: Response): Record<string, string> {
  const setCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [];
  const jar: Record<string, string> = {};
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return jar;
}

function jarToHeader(jar: Record<string, string>) {
  return Object.entries(jar)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function getCsrf(cookies: Record<string, string>) {
  const res = await fetch(BASE + '/api/auth/csrf', {
    headers: cookies && Object.keys(cookies).length > 0 ? { cookie: jarToHeader(cookies) } : {},
  });
  const newCookies = { ...cookies, ...cookiesFrom(res) };
  const body = (await res.json()) as any;
  return { csrfToken: body.csrfToken as string, cookies: newCookies };
}

async function loginUser(email: string, pass: string): Promise<Record<string, string>> {
  const { csrfToken, cookies } = await getCsrf({});
  const res = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: jarToHeader(cookies),
      origin: BASE,
    },
    body: new URLSearchParams({ csrfToken, identifier: email, password: pass, redirect: 'false' }).toString(),
  });
  return { ...cookies, ...cookiesFrom(res) };
}

async function main() {
  const EMAIL = 'step38-live-admin@fixture.local';
  const PASSWORD = 'Step38Live!Pass123';
  const cookieJar = await loginUser(EMAIL, PASSWORD);

  const edgeProcess = spawn(EDGE_PATH, [
    '--headless',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\talwi\\AppData\\Local\\Temp\\edge-test-transition',
    '--disable-gpu',
    '--no-first-run',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const newTab = (await newTabRes.json()) as any;
  const ws = new (globalThis as any).WebSocket(newTab.webSocketDebuggerUrl);

  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  function send(method: string, params: any = {}): Promise<any> {
    return new Promise((res) => {
      const curId = ++id;
      const handler = (event: any) => {
        const d = JSON.parse(event.data);
        if (d.id === curId) {
          ws.removeEventListener('message', handler);
          res(d.result || d);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  for (const [name, value] of Object.entries(cookieJar)) {
    await send('Network.setCookie', { name, value, url: BASE });
  }

  await send('Page.navigate', { url: `${BASE}/dashboard/products` });
  await new Promise((r) => setTimeout(r, 2000));

  const testRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const panel = document.querySelector('.glow-panel.overflow-hidden') || document.querySelector('.glow-panel');
      if (!panel) return { error: 'No panel found' };

      const restBefore = window.getComputedStyle(panel, '::before').opacity;
      const restAfter = window.getComputedStyle(panel, '::after').opacity;

      // Disable transition so we see the target computed style immediately
      const styleTag = document.createElement('style');
      styleTag.id = 'test-instant-transition';
      styleTag.textContent = '.glow-panel::before, .glow-panel::after { transition-duration: 0s !important; }';
      document.head.appendChild(styleTag);

      // Now set data-hovered="true"
      panel.setAttribute('data-hovered', 'true');
      const hoverBefore = window.getComputedStyle(panel, '::before').opacity;
      const hoverAfter = window.getComputedStyle(panel, '::after').opacity;

      // Remove instant style
      styleTag.remove();

      return {
        panelClass: panel.className,
        restBefore,
        restAfter,
        hoverBefore,
        hoverAfter,
      };
    })()`,
    returnByValue: true,
  });

  console.log('TRANSITION TEST RESULT:', testRes.result?.value);
  edgeProcess.kill();
}

main().catch(console.error);
