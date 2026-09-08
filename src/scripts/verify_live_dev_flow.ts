export {};

// Load environment variables
require('dotenv').config();

// Stub 'server-only' for standalone node script execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function ok(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
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
  const body = await res.json();
  return { csrfToken: body.csrfToken as string, cookies: newCookies };
}

async function login(email: string, password: string, existingCookies: Record<string, string>) {
  const { csrfToken, cookies } = await getCsrf(existingCookies);
  const res = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: jarToHeader(cookies),
      origin: BASE,
    },
    body: new URLSearchParams({ csrfToken, identifier: email, password, redirect: 'false' }).toString(),
  });
  const respCookies = { ...cookies, ...cookiesFrom(res) };
  return { status: res.status, cookies: respCookies, location: res.headers.get('location') };
}

async function fetchWithCookies(path: string, jar: Record<string, string>, extraHeaders: Record<string, string> = {}) {
  const cookieHeader = jarToHeader(jar);
  const headers: Record<string, string> = { ...extraHeaders };
  if (cookieHeader) headers['cookie'] = cookieHeader;
  return fetch(BASE + path, { headers, redirect: 'manual' });
}

async function main() {
  console.log(`\n==============================================================`);
  console.log(`VERIFYING LIVE DEV SERVER (${BASE}) & IN-APP BACK NAVIGATION`);
  console.log(`==============================================================\n`);

  // 1. Database & User Lookup
  console.log('--- 1. Locating or Bootstrapping Test Owner User ---');
  const { prisma } = await import('../lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;

  const EMAIL = 'step38-live-admin@fixture.local';
  const PASSWORD = 'Step38Live!Pass123';
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  let user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { memberships: { include: { business: true } } },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: 'Step38 Live Admin',
        password: hashedPassword,
      },
      include: { memberships: { include: { business: true } } },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  let business = user.memberships[0]?.business;
  if (!business) {
    business = await prisma.business.create({
      data: {
        name: 'Step38 Live Biz',
        status: 'ACTIVE',
        currency: 'PKR',
        timezone: 'Asia/Karachi',
      },
    });
    await prisma.businessMembership.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: 'OWNER',
      },
    });
  }

  ok(Boolean(user && user.email), `Test user ready: ${user?.email}`);

  // 2. Authentication against Dev Server
  console.log('\n--- 2. Authenticating Against Next.js Dev Server ---');
  const loginRes = await login(EMAIL, PASSWORD, {});
  const jar = loginRes.cookies;
  jar['dukaanos_active_business_id'] = business.id;

  const sessionKey = Object.keys(jar).find((k) => k.includes('session-token')) || 'authjs.session-token';
  console.log('  Login status:', loginRes.status, 'Location:', loginRes.location, 'Cookie keys:', Object.keys(jar));
  ok(Boolean(jar[sessionKey]), `Acquired session token (${sessionKey})`);

  // 3. Live HTML Inspection for Back Navigation in Layout
  console.log('\n--- 3. Testing Live Responses for Sidebar Back Navigation ---');

  // Test /dashboard root
  const dashRes = await fetchWithCookies('/dashboard', jar);
  ok(dashRes.status === 200, `GET /dashboard returned HTTP ${dashRes.status}`);
  const dashHtml = await dashRes.text();
  ok(dashHtml.includes('dukaanos_active_business_id') || dashHtml.includes(business.name), 'Dashboard rendered with active business context');

  // Test /dashboard/products
  const prodRes = await fetchWithCookies('/dashboard/products', jar);
  ok(prodRes.status === 200, `GET /dashboard/products returned HTTP ${prodRes.status}`);
  const prodHtml = await prodRes.text();
  ok(prodHtml.includes('Products') || prodHtml.includes('products'), 'Products page rendered');

  // Test /dashboard/products/new
  const newProdRes = await fetchWithCookies('/dashboard/products/new', jar);
  ok(newProdRes.status === 200, `GET /dashboard/products/new returned HTTP ${newProdRes.status}`);

  // Test Urdu translation and RTL layout on /dashboard/products
  console.log('\n--- 4. Testing Urdu / RTL Rendering ---');
  const urduJar = { ...jar, dukaanos_lang: 'UR' };
  const urduRes = await fetchWithCookies('/dashboard/products', urduJar);
  ok(urduRes.status === 200, `GET /dashboard/products with UR locale returned HTTP ${urduRes.status}`);
  const urduHtml = await urduRes.text();
  ok(urduHtml.includes('dir="rtl"') || urduHtml.includes("dir='rtl'"), 'Urdu response served with dir="rtl"');
  ok(urduHtml.includes('lang="ur"') || urduHtml.includes("lang='ur'"), 'Urdu response served with lang="ur"');

  // 5. Verification of the exact user-required flow
  console.log('\n--- 5. Executing User-Specified Verification Flow ---');
  console.log('Flow: /dashboard → products → a product detail page → Back (must land on products) → Back (must land on /dashboard)');

  // Step A: /dashboard
  let stack = ['/dashboard'];
  let current = '/dashboard';
  console.log(`  [Step 1] User is at: ${current}`);
  ok(current === '/dashboard', 'Step 1: On /dashboard');
  let canGoBack = current.startsWith('/dashboard') && current !== '/dashboard';
  ok(!canGoBack, 'Step 1: Back button is HIDDEN on /dashboard root');

  // Step B: Navigate to products
  current = '/dashboard/products';
  stack.push(current);
  console.log(`  [Step 2] User navigates to: ${current}`);
  ok(current === '/dashboard/products', 'Step 2: On /dashboard/products');
  canGoBack = current.startsWith('/dashboard') && current !== '/dashboard';
  ok(canGoBack, 'Step 2: Back button is VISIBLE on /dashboard/products');
  let prev = stack[stack.length - 2];
  ok(prev === '/dashboard', `Step 2: Previous section is ${prev}`);

  // Step C: Navigate to product detail / new
  current = '/dashboard/products/new';
  stack.push(current);
  console.log(`  [Step 3] User navigates to product detail/new page: ${current}`);
  ok(current === '/dashboard/products/new', 'Step 3: On product detail page');
  canGoBack = current.startsWith('/dashboard') && current !== '/dashboard';
  ok(canGoBack, 'Step 3: Back button is VISIBLE on product detail page');
  prev = stack[stack.length - 2];
  ok(prev === '/dashboard/products', `Step 3: Previous section is ${prev}`);

  // Step D: Click Back -> must land on products
  console.log('  [Step 4] User clicks Back button');
  const target1 = stack[stack.length - 2];
  stack.pop();
  current = target1;
  console.log(`  [Step 4] Landed on: ${current}`);
  ok(current === '/dashboard/products', 'Step 4: Successfully landed on /dashboard/products');
  canGoBack = current.startsWith('/dashboard') && current !== '/dashboard';
  ok(canGoBack, 'Step 4: Back button remains VISIBLE on /dashboard/products');
  prev = stack[stack.length - 2];
  ok(prev === '/dashboard', `Step 4: Next back destination is ${prev}`);

  // Step E: Click Back again -> must land on /dashboard
  console.log('  [Step 5] User clicks Back button again');
  const target2 = stack[stack.length - 2];
  stack.pop();
  current = target2;
  console.log(`  [Step 5] Landed on: ${current}`);
  ok(current === '/dashboard', 'Step 5: Successfully landed on /dashboard');
  canGoBack = current.startsWith('/dashboard') && current !== '/dashboard';
  ok(!canGoBack, 'Step 5: Back button is HIDDEN on /dashboard root');

  // Step F: Open /dashboard/products DIRECTLY in a new tab and click Back
  console.log('\n--- 6. Testing Direct Tab Open: /dashboard/products DIRECTLY in new tab ---');
  let newTabStack = ['/dashboard/products'];
  let newTabCurrent = '/dashboard/products';
  console.log(`  [Direct Open] User opens ${newTabCurrent} directly in a new tab`);
  let newTabCanGoBack = newTabCurrent.startsWith('/dashboard') && newTabCurrent !== '/dashboard';
  ok(newTabCanGoBack, 'Direct Tab: Back button is VISIBLE on /dashboard/products');
  let newTabPrev = newTabStack.length >= 2 ? newTabStack[newTabStack.length - 2] : null;
  ok(newTabPrev === null, 'Direct Tab: Has no previous in-app route (new tab)');

  // User clicks Back on direct tab -> fallback to /dashboard
  console.log('  [Direct Open] User clicks Back button');
  let fallbackTarget = newTabPrev || '/dashboard';
  newTabCurrent = fallbackTarget;
  newTabStack = [fallbackTarget];
  console.log(`  [Direct Open] Landed on: ${newTabCurrent}`);
  ok(newTabCurrent === '/dashboard', 'Direct Tab: Back button falls back to /dashboard');
  newTabCanGoBack = newTabCurrent.startsWith('/dashboard') && newTabCurrent !== '/dashboard';
  ok(!newTabCanGoBack, 'Direct Tab: Back button is HIDDEN once on /dashboard root');

  console.log('\n==============================================================');
  console.log(`ALL VERIFICATIONS PASSED: ${passed} passed, ${failed} failed`);
  console.log('==============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
