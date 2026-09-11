export {};
require('dotenv').config();

const BASE = 'http://127.0.0.1:3000';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

import { spawn } from 'child_process';

class CDPClient {
  private ws: any;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();

  constructor(wsUrl: string) {
    this.ws = new (globalThis as any).WebSocket(wsUrl);
  }

  async ready(): Promise<void> {
    if (this.ws.readyState === 1) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err: any) => reject(err);
      this.ws.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id)!;
            this.callbacks.delete(msg.id);
            cb(msg.result || msg);
          }
        } catch (e) {}
      };
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve) => {
      const id = ++this.id;
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function main() {
  const edgeProcess = spawn(EDGE_PATH, [
    '--headless',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\talwi\\AppData\\Local\\Temp\\edge-inspect-controls',
    '--disable-gpu',
    '--no-first-run',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1000));
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const newTab = (await newTabRes.json()) as any;
  const client = new CDPClient(newTab.webSocketDebuggerUrl);
  await client.ready();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');

  const { prisma } = await import('../lib/db/prisma');
  const user = await prisma.user.findFirst();
  const res = await fetch(BASE + '/api/auth/csrf');
  const csrf = ((await res.json()) as any).csrfToken;
  const setCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [];
  let cookieHeader = setCookies.map((c: string) => c.split(';')[0]).join('; ');

  const loginRes = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookieHeader, origin: BASE },
    body: new URLSearchParams({ csrfToken: csrf, identifier: 'step38-live-admin@fixture.local', password: 'Step38Live!Pass123', redirect: 'false' }).toString(),
  });
  const loginCookies = (loginRes.headers as any).getSetCookie ? (loginRes.headers as any).getSetCookie() : [];
  const jar: Record<string, string> = {};
  for (const c of [...setCookies, ...loginCookies]) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar[pair.slice(0, idx)] = pair.slice(idx + 1);
  }

  for (const [name, value] of Object.entries(jar)) {
    await client.send('Network.setCookie', { name, value, url: BASE });
  }

  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });

  for (const route of ['/dashboard/categories', '/dashboard/suppliers']) {
    console.log(`\n=== Checking Route: ${route} ===`);
    await client.send('Page.navigate', { url: `${BASE}${route}` });
    await new Promise((r) => setTimeout(r, 2000));

    const check = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const panel = document.querySelector('.glow-panel.overflow-hidden') || 
                      Array.from(document.querySelectorAll('.glow-panel')).find(p => p.querySelector('table, form, .divide-y, input, button, nav')) || 
                      document.querySelector('.glow-panel');
        if (!panel) return { error: 'No panel' };

        const input = panel.querySelector('input:not([type="hidden"])');
        let inputOk = true;
        if (input) {
          input.focus();
          inputOk = document.activeElement === input;
        }

        const btns = Array.from(panel.querySelectorAll('button:not([disabled]), a[href]:not([disabled])'));
        const checks = [];
        for (const b of btns.slice(0, 5)) {
          b.scrollIntoView({ behavior: 'instant', block: 'center' });
          const bRect = b.getBoundingClientRect();
          const hit = document.elementFromPoint(bRect.left + bRect.width / 2, bRect.top + bRect.height / 2);
          checks.push({
            btnHtml: b.outerHTML.slice(0, 80),
            hitHtml: hit ? hit.outerHTML.slice(0, 80) : null,
            contains: hit ? b.contains(hit) : false,
            equal: hit === b
          });
        }
        return { inputOk, checks };
      })()`,
      returnByValue: true
    });

    console.log('Result:', JSON.stringify(check.result?.value, null, 2));
  }

  client.close();
  edgeProcess.kill();
}

main().catch(console.error);
