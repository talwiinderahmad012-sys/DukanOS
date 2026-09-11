export {};

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
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
    '--user-data-dir=C:\\Users\\talwi\\AppData\\Local\\Temp\\edge-debug-eval',
    '--disable-gpu',
    '--no-first-run',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  // Create or get page
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const newTab = (await newTabRes.json()) as any;
  const pageWsUrl = newTab.webSocketDebuggerUrl;
  console.log('Target Page URL:', newTab.url, 'WS:', pageWsUrl);
  const ws = new (globalThis as any).WebSocket(pageWsUrl);

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

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const panel = document.querySelector('.glow-panel');
      if (!panel) return { error: 'No panel found', url: location.href };
      
      const beforeRest = window.getComputedStyle(panel, '::before').opacity;
      
      panel.setAttribute('data-hovered', 'true');
      const beforeHoverData = window.getComputedStyle(panel, '::before').opacity;
      
      const afterHoverData = window.getComputedStyle(panel, '::after').opacity;
      
      const matchingRules = [];
      for (const s of document.styleSheets) {
        try {
          for (const r of s.cssRules) {
            if (r.cssText && r.cssText.includes('glow-panel')) matchingRules.push(r.cssText);
          }
        } catch(e) {}
      }

      return {
        url: location.href,
        class: panel.className,
        beforeRest,
        beforeHoverData,
        afterHoverData,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        rulesCount: matchingRules.length,
        rules: matchingRules.slice(0, 8),
      };
    })()`,
    returnByValue: true,
  });

  console.log('Eval Result:', res.result?.value);

  // Set large desktop viewport so full dashboard fits
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Scroll panel into view and get fresh client rect
  const rectRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const panels = Array.from(document.querySelectorAll('.glow-panel'));
      const panel = panels.find(p => p.querySelector('table, form, .divide-y')) || panels[panels.length - 1];
      panel.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = panel.getBoundingClientRect();
      return { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2,
        class: panel.className,
        restingBefore: window.getComputedStyle(panel, '::before').opacity,
      };
    })()`,
    returnByValue: true,
  });
  const pt = rectRes.result?.value;
  console.log('Target panel info after scrollIntoView:', pt);

  // Get nodeId of the large panel
  const doc = await send('DOM.getDocument');
  const nodeRes = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: '.glow-panel.overflow-hidden',
  });
  console.log('Panel nodeId:', nodeRes.nodeId);

  // Force :hover pseudo-state on the panel
  await send('CSS.forcePseudoState', {
    nodeId: nodeRes.nodeId,
    forcedPseudoClasses: ['hover'],
  });

  // Wait for 350ms transition
  await new Promise((r) => setTimeout(r, 450));

  const mouseHoverRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const panels = Array.from(document.querySelectorAll('.glow-panel'));
      const panel = panels.find(p => p.querySelector('table, form, .divide-y')) || panels[panels.length - 1];
      const hit = document.elementFromPoint(${pt.x}, ${pt.y});
      const cs = window.getComputedStyle(panel, '::before');
      const csAfter = window.getComputedStyle(panel, '::after');
      const panelCs = window.getComputedStyle(panel);
      return {
        hitTag: hit ? hit.tagName : null,
        isHover: panel.matches(':hover'),
        before: {
          opacity: cs.opacity,
          display: cs.display,
          content: cs.content,
          position: cs.position,
          transition: cs.transition,
          visibility: cs.visibility,
          zIndex: cs.zIndex,
        },
        after: {
          opacity: csAfter.opacity,
          display: csAfter.display,
          content: csAfter.content,
        },
        panel: {
          opacity: panelCs.opacity,
          visibility: panelCs.visibility,
        }
      };
    })()`,
    returnByValue: true,
  });
  console.log('Detailed computed styles of ::before on hovered panel:', JSON.stringify(mouseHoverRes.result?.value, null, 2));

  edgeProcess.kill();
}

main().catch(console.error);
