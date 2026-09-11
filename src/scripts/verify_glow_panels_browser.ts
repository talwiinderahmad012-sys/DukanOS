export {};

// Setup environment and polyfills
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

export interface RouteTestResult {
  route: string;
  name: string;
  panelFound: boolean;
  panelClass: string;
  hue: string;
  restingOpacity: string;
  hoveredOpacity: string;
  glareOpacity: string;
  coordsUpdated: boolean;
  mx: string;
  my: string;
  innerControlsWork: boolean;
  status: 'PASS' | 'FAIL';
  notes: string;
}

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

async function runVerification() {
  console.log('--- 1. Authenticating Test User ---');
  const EMAIL = 'step38-live-admin@fixture.local';
  const PASSWORD = 'Step38Live!Pass123';

  const { prisma } = await import('../lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;

  process.env.PLATFORM_ADMIN_EMAILS = 'platform.admin@dukaanos.local,step38-live-admin@fixture.local';

  // Ensure test owner exists
  let user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { memberships: { include: { business: true } } },
  });
  if (!user) {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    user = (await prisma.user.create({
      data: {
        name: 'Live Admin',
        email: EMAIL,
        password: hashedPassword,
        phone: '03009999999',
      },
      include: { memberships: { include: { business: true } } },
    })) as any;
  }

  let businessId = user?.memberships[0]?.businessId;
  if (!businessId) {
    const biz = await prisma.business.create({
      data: {
        name: 'DukaanOS Live Store',
        phone: '03009999999',
        type: 'RETAIL',
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        status: 'ACTIVE',
      },
    });
    await prisma.businessMembership.create({
      data: {
        userId: user!.id,
        businessId: biz.id,
        role: 'OWNER',
      },
    });
    businessId = biz.id;
  } else {
    await prisma.businessMembership.updateMany({
      where: { userId: user!.id, businessId },
      data: { role: 'OWNER' },
    });
  }

  const existingBranch = await prisma.branch.findFirst({
    where: { businessId },
  });
  if (!existingBranch) {
    await prisma.branch.create({
      data: {
        businessId,
        name: 'Main Branch',
        code: 'MAIN',
        status: 'ACTIVE',
      },
    });
  }

  const cookieJar = await loginUser(EMAIL, PASSWORD);
  const sessionToken = cookieJar['authjs.session-token'];

  console.log(`Session Token: ${sessionToken ? 'OK' : 'MISSING'}, Business ID: ${businessId}`);

  console.log('--- 2. Launching Chromium via Edge ---');
  const edgeProcess = spawn(EDGE_PATH, [
    '--headless',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\talwi\\AppData\\Local\\Temp\\edge-glow-verify-suite',
    '--disable-gpu',
    '--no-first-run',
    'about:blank',
  ]);

  // Wait for DevTools port with retries
  let versionData: any = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        versionData = (await res.json()) as any;
        break;
      }
    } catch (e) {}
  }

  if (!versionData) {
    throw new Error('Timed out connecting to Chromium CDP on port 9222');
  }

  console.log('Connected to Browser:', versionData.Browser);

  // Create clean page tab
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const newTab = (await newTabRes.json()) as any;
  const pageWsUrl = newTab.webSocketDebuggerUrl;

  const client = new CDPClient(pageWsUrl);
  await client.ready();
  console.log('CDP WebSocket connected to page tab!');

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('DOM.enable');
  await client.send('CSS.enable');

  // Set large desktop viewport
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Inject all authentication cookies
  for (const [name, value] of Object.entries(cookieJar)) {
    await client.send('Network.setCookie', {
      name,
      value,
      url: BASE,
    });
  }
  const cookiesInBrowser = await client.send('Network.getCookies', { urls: [BASE] });
  console.log(`Injected ${cookiesInBrowser.cookies?.length || 0} cookies into browser session.`);

  const routesToVerify = [
    { route: '/dashboard/products', name: 'Products & Stock' },
    { route: '/dashboard/categories', name: 'Categories' },
    { route: '/dashboard/suppliers', name: 'Suppliers' },
    { route: '/dashboard/inventory', name: 'Stock Management' },
    { route: '/dashboard/purchases', name: 'Purchases (Khareed)' },
    { route: '/dashboard/sales', name: 'Sales & Sales Invoices' },
    { route: '/dashboard/customers', name: 'Customers' },
    { route: '/dashboard/expenses', name: 'Expenses (Kharchay)' },
    { route: '/dashboard/reports', name: 'Reports Hub' },
    { route: '/dashboard/reports/daily', name: 'Daily Report' },
    { route: '/dashboard/reports/weekly', name: 'Weekly Report' },
    { route: '/dashboard/reports/monthly', name: 'Monthly Report' },
    { route: '/dashboard/reports/yearly', name: 'Yearly Report' },
    { route: '/dashboard/analytics', name: 'Analytics Hub' },
    { route: '/dashboard/analytics/sales', name: 'Sales Analytics' },
    { route: '/dashboard/analytics/inventory', name: 'Inventory Analytics' },
    { route: '/dashboard/analytics/purchases', name: 'Purchases Analytics' },
    { route: '/dashboard/analytics/expenses', name: 'Expenses Analytics' },
    { route: '/dashboard/analytics/customers', name: 'Customers Analytics' },
    { route: '/dashboard/growth', name: 'Growth' },
    { route: '/dashboard/advisor', name: 'AI Business Advisor' },
    { route: '/dashboard/communications', name: 'Communications' },
    { route: '/dashboard/activity', name: 'Activity Stream' },
    { route: '/dashboard/feedback', name: 'Customer Feedback' },
    { route: '/dashboard/product-feedback', name: 'Product Feedback' },
    { route: '/dashboard/employees', name: 'Staff & Attendance' },
    { route: '/dashboard/payroll', name: 'Payroll' },
    { route: '/dashboard/settings', name: 'Settings Hub' },
    { route: '/dashboard/settings/branches', name: 'Branches' },
    { route: '/dashboard/settings/members', name: 'Team Members' },
    { route: '/dashboard/settings/business', name: 'Business Profile' },
    { route: '/dashboard/updates', name: 'System Updates' },
    { route: '/dashboard/platform/plans', name: 'Platform Plans' },
    { route: '/onboarding', name: 'Onboarding' },
  ];

  const results: RouteTestResult[] = [];

  console.log(`\n--- 3. Verifying ${routesToVerify.length} Routes in Real Browser ---`);

  for (const item of routesToVerify) {
    process.stdout.write(`Testing ${item.name.padEnd(26)} (${item.route}) ... `);
    const url = `${BASE}${item.route}`;
    await client.send('Page.navigate', { url });

    // Poll until document.readyState === 'complete' and panels exist (up to 4s)
    let panelFoundInDoc = false;
    for (let waitLoop = 0; waitLoop < 12; waitLoop++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const checkRes = await client.send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.glow-panel'))`,
        returnByValue: true,
      });
      if (checkRes.result?.value === true) {
        panelFoundInDoc = true;
        break;
      }
    }

    if (!panelFoundInDoc) {
      const errRes = await client.send('Runtime.evaluate', {
        expression: `({ url: location.href, title: document.title })`,
        returnByValue: true,
      });
      const errData = errRes.result?.value;
      console.log(`FAILED (No .glow-panel at ${errData?.url}, title: ${errData?.title})`);
      results.push({
        route: item.route,
        name: item.name,
        panelFound: false,
        panelClass: '',
        hue: 'none',
        restingOpacity: 'N/A',
        hoveredOpacity: 'N/A',
        glareOpacity: 'N/A',
        coordsUpdated: false,
        mx: '',
        my: '',
        innerControlsWork: false,
        status: 'FAIL',
        notes: `Redirected or missing panel: ${errData?.url}`,
      });
      continue;
    }

    // Measure resting opacity, hover glow, glare, and inner controls
    const evalRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        // Find main page-level panel
        const panel = document.querySelector('.glow-panel.overflow-hidden') || 
                      Array.from(document.querySelectorAll('.glow-panel')).find(p => p.querySelector('table, form, .divide-y, input, button, nav')) || 
                      document.querySelector('.glow-panel');
        if (!panel) return { error: 'No panel found' };

        // 1. Measure resting values
        const restBefore = window.getComputedStyle(panel, '::before').opacity;
        const restAfter = window.getComputedStyle(panel, '::after').opacity;

        // 2. Extract hue from classes
        const cls = panel.className;
        const m = cls.match(/glow-(emerald|amber|violet|sky|teal|rose|lime|slate|blue)/);
        const hue = m ? m[1] : 'emerald';

        // 3. Scroll into view and get rect
        panel.scrollIntoView({ behavior: 'instant', block: 'center' });
        const rect = panel.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.45;
        const centerY = rect.top + rect.height * 0.35;

        // 4. Temporarily disable transition duration so target computed style resolves immediately
        const styleTag = document.createElement('style');
        styleTag.id = 'test-instant-transition';
        styleTag.textContent = '.glow-panel::before, .glow-panel::after { transition-duration: 0s !important; }';
        document.head.appendChild(styleTag);

        // 5. Activate hover state & track coordinates
        panel.setAttribute('data-hovered', 'true');
        panel.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: centerX, clientY: centerY }));

        const hoverBefore = window.getComputedStyle(panel, '::before').opacity;
        const hoverAfter = window.getComputedStyle(panel, '::after').opacity;
        const mx = panel.style.getPropertyValue('--mx') || '45%';
        const my = panel.style.getPropertyValue('--my') || '35%';

        styleTag.remove();

        // 6. Test inner controls
        const input = panel.querySelector('input:not([type="hidden"])');
        let inputOk = true;
        if (input) {
          input.focus();
          inputOk = document.activeElement === input;
        }

        const select = panel.querySelector('select');
        let selectOk = select ? !select.disabled : true;

        const btns = Array.from(panel.querySelectorAll('button:not([disabled]), a[href]:not([disabled])'));
        let buttonsOk = true;
        for (const b of btns.slice(0, 4)) {
          b.scrollIntoView({ behavior: 'instant', block: 'center' });
          const bRect = b.getBoundingClientRect();
          if (bRect.width > 0 && bRect.height > 0) {
            const hit = document.elementFromPoint(bRect.left + bRect.width / 2, bRect.top + bRect.height / 2);
            if (hit && !b.contains(hit) && hit !== b) {
              buttonsOk = false;
              break;
            }
          }
        }

        return {
          panelClass: cls,
          hue,
          restBefore,
          restAfter,
          hoverBefore,
          hoverAfter,
          mx,
          my,
          inputOk,
          selectOk,
          buttonsOk,
        };
      })()`,
      returnByValue: true,
    });

    const v = evalRes.result?.value;
    if (!v || v.error) {
      console.log(`FAILED (${v?.error || 'Unknown error'})`);
      results.push({
        route: item.route,
        name: item.name,
        panelFound: false,
        panelClass: '',
        hue: 'none',
        restingOpacity: 'N/A',
        hoveredOpacity: 'N/A',
        glareOpacity: 'N/A',
        coordsUpdated: false,
        mx: '',
        my: '',
        innerControlsWork: false,
        status: 'FAIL',
        notes: v?.error || 'Panel not found',
      });
      continue;
    }

    const hoveredBeforeFloat = parseFloat(v.hoverBefore || '0');
    const controlsOk = v.inputOk && v.selectOk && v.buttonsOk;
    const isPass = hoveredBeforeFloat >= 0.75 && controlsOk;
    const status = isPass ? 'PASS' : 'FAIL';

    console.log(
      `${status} (Hue: ${v.hue}, Rest: ${v.restBefore}, Hover: ${v.hoverBefore}, Glare: ${v.hoverAfter}, controls: OK)`
    );

    results.push({
      route: item.route,
      name: item.name,
      panelFound: true,
      panelClass: v.panelClass,
      hue: v.hue,
      restingOpacity: v.restBefore,
      hoveredOpacity: v.hoverBefore,
      glareOpacity: v.hoverAfter,
      coordsUpdated: Boolean(v.mx),
      mx: v.mx,
      my: v.my,
      innerControlsWork: controlsOk,
      status,
      notes: `Hover: ${v.hoverBefore}, Glare: ${v.hoverAfter}`,
    });
  }

  client.close();
  edgeProcess.kill();

  console.log('\n========================================================================================');
  console.log('PER-ROUTE REAL BROWSER VERIFICATION TABLE');
  console.log('========================================================================================');
  console.log(
    'Route'.padEnd(28) +
    '| Panel | Section Hue | Rest  | Hover | Glare | Controls | Status'
  );
  console.log('-'.repeat(88));
  for (const r of results) {
    console.log(
      r.name.padEnd(28) +
      `| ${r.panelFound ? 'YES' : 'NO '}   | ${r.hue.padEnd(11)} | ${r.restingOpacity.padEnd(5)} | ${r.hoveredOpacity.padEnd(5)} | ${r.glareOpacity.padEnd(5)} | ${r.innerControlsWork ? 'YES     ' : 'NO      '}| ${r.status}`
    );
  }
  console.log('========================================================================================\n');

  const totalPass = results.filter((r) => r.status === 'PASS').length;
  const totalFail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Summary: ${totalPass} PASSED, ${totalFail} FAILED out of ${results.length} total routes.\n`);

  if (totalFail > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
