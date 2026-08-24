export {};

/**
 * STEP 38 — LIVE PRODUCTION RUNTIME VERIFICATION
 *
 * Runs against an ALREADY-RUNNING production build of DukaanOS.
 * Usage:
 *   1. Build:      node node_modules/next/dist/bin/next build
 *   2. Start:      node .next/standalone/server.js  (port 3100, env: CRON_SECRET, APP_URL, ...)
 *      — OR —      node node_modules/next/dist/bin/next start -p 3100
 *   3. Run:        node node_modules/tsx/dist/cli.mjs src/scripts/test_step38_live_runtime.ts
 *
 * Environment variables (all optional):
 *   STEP38_BASE_URL  (default http://localhost:3100)
 *   STEP38_EMAIL     (default step38-live-admin@fixture.local — auto-created)
 *   STEP38_PASSWORD  (default Step38Live!Pass123)
 *
 * The script is read-only with respect to business data. It creates:
 *   - One admin fixture user + business + membership (only if missing)
 *   - One orphan user (for onboarding-redirect verification, only if missing)
 *   - One rate-limit user + business (for rate-limit verification)
 * It never modifies or deletes existing records.
 */

require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const BASE = process.env.STEP38_BASE_URL || 'http://localhost:3100';
const EMAIL = process.env.STEP38_EMAIL || 'step38-live-admin@fixture.local';
const PASSWORD = process.env.STEP38_PASSWORD || 'Step38Live!Pass123';
const CRON_SECRET = process.env.CRON_SECRET || 'step38-test-cron-secret';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) {
    console.log('  PASS:', msg);
    passed++;
  } else {
    console.log('  FAIL:', msg);
    failed++;
  }
}
function q(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

async function fetchNoFollow(path: string, opts?: RequestInit) {
  return fetch(BASE + path, { redirect: 'manual', ...opts });
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
  const res = await fetchNoFollow('/api/auth/csrf', { headers: cookies ? { cookie: jarToHeader(cookies) } : {} });
  const newCookies = { ...cookies, ...cookiesFrom(res) };
  const body = await res.json();
  return { csrfToken: body.csrfToken as string, cookies: newCookies };
}

async function login(email: string, password: string, existingCookies: Record<string, string>) {
  const { csrfToken, cookies } = await getCsrf(existingCookies);
  const res = await fetchNoFollow('/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: jarToHeader(cookies),
      origin: BASE,
    },
    body: new URLSearchParams({ csrfToken, email, password, redirect: 'false' }).toString(),
  });
  const respCookies = { ...cookies, ...cookiesFrom(res) };
  return { status: res.status, cookies: respCookies };
}

async function main() {
  const t0 = Date.now();
  console.log(`--- STEP 38 LIVE RUNTIME VERIFICATION (${BASE}) ---`);

  console.log('\n=== SETUP: fixture user/business/membership ===');
  const setupBefore = (await q(
    'SELECT (SELECT count(*)::int FROM "User") u, (SELECT count(*)::int FROM "Business") b, (SELECT count(*)::int FROM "BusinessMembership") m'
  )).rows[0];
  const usersBefore = setupBefore.u;
  const businessesBefore = setupBefore.b;
  const membershipsBefore = setupBefore.m;

  const existingUser = (await q('SELECT id FROM "User" WHERE email=$1', [EMAIL])).rows[0];
  let liveBusiness: { id: string; name: string };
  const insertBusinessSql =
    "INSERT INTO \"Business\" (id,name,status,timezone,currency,\"createdAt\",\"updatedAt\") VALUES (gen_random_uuid(),$1,'ACTIVE','Asia/Karachi','PKR',now(),now()) RETURNING id";
  const insertMembershipSql =
    'INSERT INTO "BusinessMembership" (id,"userId","businessId",role,"createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,\'OWNER\',now(),now())';
  if (!existingUser) {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const u = (await q(
      'INSERT INTO "User" (id,email,name,password,"createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,$3,now(),now()) RETURNING id',
      [EMAIL, 'Step38 Live Admin', hash]
    )).rows[0];
    const b = (await q(insertBusinessSql, ['Step38 Live Biz'])).rows[0];
    await q(insertMembershipSql, [u.id, b.id]);
    liveBusiness = { id: b.id, name: 'Step38 Live Biz' };
    console.log('  fixture created');
  } else {
    const m = (await q(
      'SELECT bm."businessId", b.name FROM "BusinessMembership" bm JOIN "Business" b ON b.id=bm."businessId" WHERE bm."userId"=$1 LIMIT 1',
      [existingUser.id]
    )).rows[0];
    if (m) {
      liveBusiness = { id: m.businessId, name: m.name };
    } else {
      const b = (await q(insertBusinessSql, ['Step38 Live Biz'])).rows[0];
      await q(insertMembershipSql, [existingUser.id, b.id]);
      liveBusiness = { id: b.id, name: 'Step38 Live Biz' };
    }
    console.log('  fixture re-used:', liveBusiness.name);
  }

  console.log('\n=== HEALTH & READINESS (live over HTTP) ===');
  const health = await fetchNoFollow('/api/health');
  const healthBody = await health.json();
  ok(health.status === 200, '/api/health returns 200');
  ok(healthBody.status === 'healthy', 'health status healthy');
  ok(healthBody.database && healthBody.database.status === 'connected', 'health reports DB connected');
  ok(!JSON.stringify(healthBody).includes('postgres://'), 'health body contains no connection string');
  const ready = await fetchNoFollow('/api/health/ready');
  const readyBody = await ready.json();
  ok(ready.status === 200, '/api/health/ready returns 200');
  ok(readyBody.status === 'ready' && readyBody.checks.database === true, 'readiness reports DB check ok');

  console.log('\n=== SECURITY HEADERS (live) ===');
  const rootRes = await fetchNoFollow('/login');
  ok(rootRes.headers.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options SAMEORIGIN');
  ok(rootRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options nosniff');
  ok((rootRes.headers.get('content-security-policy') || '').includes("default-src 'self'"), 'CSP present');
  ok((rootRes.headers.get('strict-transport-security') || '').startsWith('max-age='), 'HSTS present in production');
  ok(rootRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy present');

  console.log('\n=== PUBLIC PAGES ===');
  for (const p of ['/', '/login', '/register', '/privacy', '/terms', '/support', '/docs', '/robots.txt', '/sitemap.xml', '/manifest.json', '/sw.js']) {
    const r = await fetchNoFollow(p);
    ok(r.status === 200, `GET ${p} -> 200 (got ${r.status})`);
  }

  console.log('\n=== UNAUTHENTICATED DASHBOARD ACCESS ===');
  const dashUnauth = await fetchNoFollow('/dashboard');
  ok(dashUnauth.status >= 300 && dashUnauth.status < 400, `GET /dashboard unauthenticated redirects (${dashUnauth.status})`);
  ok((dashUnauth.headers.get('location') || '').includes('/login'), 'redirect leads to /login');

  console.log('\n=== INVALID LOGIN ===');
  const invalid = await login(EMAIL, 'WrongPassword!123', {});
  ok(!invalid.cookies['authjs.session-token'], 'invalid login: no session cookie issued');

  console.log('\n=== VALID LOGIN + SESSION + DASHBOARD ===');
  const good = await login(EMAIL, PASSWORD, {});
  ok(Boolean(good.cookies['authjs.session-token']), 'valid login issues authjs.session-token');
  const sessionRes = await fetchNoFollow('/api/auth/session', { headers: { cookie: jarToHeader(good.cookies) } });
  const session = await sessionRes.json();
  ok(session && session.user && session.user.email === EMAIL, `session user email = ${EMAIL}`);
  const dashAuth = await fetchNoFollow('/dashboard', { headers: { cookie: jarToHeader(good.cookies) } });
  ok(dashAuth.status === 200, `GET /dashboard authenticated -> 200 (got ${dashAuth.status})`);
  const dashHtml = await dashAuth.text();
  ok(dashHtml.includes(liveBusiness.name), 'dashboard renders active business name');
  const countsMid = (await q(
    'SELECT (SELECT count(*)::int FROM "User") u, (SELECT count(*)::int FROM "Business") b, (SELECT count(*)::int FROM "BusinessMembership") m'
  )).rows[0];
  ok(
    countsMid.u === usersBefore && countsMid.b === businessesBefore && countsMid.m === membershipsBefore,
    'login+dashboard did not create users/businesses/memberships'
  );

  console.log('\n=== ACTIVE-BUSINESS COOKIE TAMPERING ===');
  const tampered = await fetchNoFollow('/dashboard', {
    headers: { cookie: jarToHeader(good.cookies) + '; dukaanos_active_business_id=not-a-real-business-id' },
  });
  ok(tampered.status === 200, `dashboard with bogus active-business cookie -> 200 (got ${tampered.status})`);
  const tamperedHtml = await tampered.text();
  ok(tamperedHtml.includes(liveBusiness.name), 'falls back to a verified membership, no crash');

  console.log('\n=== LOGOUT ===');
  const { csrfToken: logoutCsrf, cookies: logoutCookies } = await getCsrf(good.cookies);
  const signOutRes = await fetchNoFollow('/api/auth/signout', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: jarToHeader(logoutCookies) },
    body: new URLSearchParams({ csrfToken: logoutCsrf, redirect: 'false', callbackUrl: BASE + '/login' }).toString(),
  });
  const signOutCookies = cookiesFrom(signOutRes);
  ok(signOutRes.status < 400 || signOutRes.status === 302, `signout request accepted (${signOutRes.status})`);
  ok('authjs.session-token' in signOutCookies && signOutCookies['authjs.session-token'] === '', 'signout response clears the session cookie');
  const postLogoutDash = await fetchNoFollow('/dashboard', { headers: { cookie: '' } });
  ok(postLogoutDash.status >= 300 && postLogoutDash.status < 400, `dashboard without session redirects (${postLogoutDash.status})`);

  console.log('\n=== LOGIN RATE LIMITING ===');
  const freshEmail = `step38-rl-${Date.now()}@fixture.local`;
  const rlHash = await bcrypt.hash(PASSWORD, 10);
  const rlUser = (await q(
    'INSERT INTO "User" (id,email,name,password,"createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,$3,now(),now()) RETURNING id',
    [freshEmail, 'Step38 RL User', rlHash]
  )).rows[0];
  const rlBiz = (await q(insertBusinessSql, ['Step38 RL Biz'])).rows[0];
  await q(insertMembershipSql, [rlUser.id, rlBiz.id]);
  let blockedCount = 0;
  for (let i = 0; i < 8; i++) {
    const attempt = await login(freshEmail, PASSWORD, {});
    if (!attempt.cookies['authjs.session-token']) blockedCount++;
  }
  ok(blockedCount > 0, `repeated logins are rate-limited (blocked ${blockedCount} of 8)`);
  // STEP 39 CORRECTION (documented): the rate-limited login path no longer
  // performs a pre-rejection user lookup, so it can no longer write
  // tenant-attributed AuditLog rows (businessId is NOT NULL). Throttled-login
  // events are preserved through recordAuthAudit's structured security log
  // instead. The invariant asserted here is now "throttled attempts cause zero
  // database audit writes".
  const rlLogsBefore = (await q('SELECT count(*)::int n FROM "AuditLog" WHERE action=$1', ['LOGIN_RATE_LIMITED'])).rows[0].n;
  let blockedAgain = 0;
  for (let i = 0; i < 3; i++) {
    const attempt = await login(freshEmail, PASSWORD, {});
    if (!attempt.cookies['authjs.session-token']) blockedAgain++;
  }
  ok(blockedAgain > 0, 'further login attempts still throttled');
  const rlLogsAfter = (await q('SELECT count(*)::int n FROM "AuditLog" WHERE action=$1', ['LOGIN_RATE_LIMITED'])).rows[0].n;
  ok(rlLogsAfter === rlLogsBefore, `throttled logins perform no DB audit writes (${rlLogsBefore} -> ${rlLogsAfter})`);

  console.log('\n=== ONBOARDING FLOW (user without business) ===');
  const orphanEmail = 'step38-live-orphan@fixture.local';
  const orphan = (await q('SELECT id FROM "User" WHERE email=$1', [orphanEmail])).rows[0];
  if (!orphan) {
    const hash = await bcrypt.hash(PASSWORD, 10);
    await q('INSERT INTO "User" (id,email,name,password,"createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,$3,now(),now())', [orphanEmail, 'Step38 Orphan', hash]);
  }
  const orphanLogin = await login(orphanEmail, PASSWORD, {});
  ok(Boolean(orphanLogin.cookies['authjs.session-token']), 'orphan user login succeeds');
  const orphanDash = await fetchNoFollow('/dashboard', { headers: { cookie: jarToHeader(orphanLogin.cookies) } });
  const orphanRedirect = orphanDash.headers.get('location') || '';
  ok(
    orphanDash.status >= 300 && orphanDash.status < 400 && orphanRedirect.includes('/onboarding'),
    `user with no business redirected to onboarding (${orphanDash.status} -> ${orphanRedirect})`
  );

  console.log('\n=== CRON ENDPOINT AUTHZ ===');
  const cronGet = await fetch(BASE + '/api/cron', { method: 'GET', redirect: 'manual' });
  ok(cronGet.status === 405 || cronGet.status === 404, `GET /api/cron rejected (${cronGet.status})`);
  const cronBad = await fetch(BASE + '/api/cron', { method: 'POST', headers: { authorization: 'Bearer definetly-wrong' }, redirect: 'manual' });
  ok(cronBad.status === 401, `POST /api/cron wrong secret -> 401 (got ${cronBad.status})`);
  const cronBadBody = await cronBad.text();
  ok(!cronBadBody.includes(CRON_SECRET), 'cron 401 body does not leak secret');
  const cronNone = await fetch(BASE + '/api/cron', { method: 'POST', redirect: 'manual' });
  ok(cronNone.status === 401, `POST /api/cron missing auth -> 401 (got ${cronNone.status})`);

  console.log('\n=== 404 HANDLING ===');
  const notFound = await fetchNoFollow('/definitely-not-a-route-xyz');
  ok(notFound.status === 404, `unknown route -> 404 (got ${notFound.status})`);
  const nfBody = await notFound.text();
  ok(!nfBody.includes('DATABASE_URL') && !nfBody.includes('AUTH_SECRET') && !nfBody.includes('CRON_SECRET'), '404 body leaks no secrets');

  console.log('\n=== AUTHENTICATED DASHBOARD ROUTE MATRIX ===');
  const routes = [
    '/dashboard', '/dashboard/me', '/dashboard/pos', '/dashboard/sync', '/dashboard/sales',
    '/dashboard/reports', '/dashboard/reports/daily', '/dashboard/reports/weekly', '/dashboard/reports/monthly', '/dashboard/reports/yearly',
    '/dashboard/growth', '/dashboard/analytics', '/dashboard/analytics/sales', '/dashboard/analytics/products',
    '/dashboard/analytics/customers', '/dashboard/analytics/inventory', '/dashboard/analytics/purchases',
    '/dashboard/analytics/expenses', '/dashboard/analytics/branches', '/dashboard/advisor', '/dashboard/monitoring',
    '/dashboard/cameras', '/dashboard/communications', '/dashboard/activity', '/dashboard/feedback',
    '/dashboard/customers', '/dashboard/employees', '/dashboard/employees/attendance', '/dashboard/employees/leaves',
    '/dashboard/employees/complaints', '/dashboard/payroll', '/dashboard/payroll/new', '/dashboard/products',
    '/dashboard/products/new', '/dashboard/categories', '/dashboard/suppliers', '/dashboard/inventory',
    '/dashboard/purchases', '/dashboard/purchases/new', '/dashboard/product-insights', '/dashboard/updates',
    '/dashboard/product-feedback', '/dashboard/settings', '/dashboard/settings/system', '/dashboard/settings/backup',
    '/dashboard/settings/plan', '/dashboard/settings/usage', '/dashboard/settings/branches', '/dashboard/settings/members',
    '/dashboard/platform/plans', '/dashboard/notifications', '/dashboard/system',
  ];
  const jar = await login(EMAIL, PASSWORD, {}).then((r) => r.cookies);
  let routesOk = 0;
  const routeProblems: string[] = [];
  for (const route of routes) {
    const r = await fetchNoFollow(route, { headers: { cookie: jarToHeader(jar) } });
    if (r.status === 200) routesOk++;
    else routeProblems.push(`${route} -> ${r.status}`);
  }
  ok(routesOk === routes.length, `All ${routes.length} dashboard routes render 200 (problems: ${routeProblems.join('; ') || 'none'})`);

  console.log('\n=== SUMMARY ===');
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`PASSED: ${passed}, FAILED: ${failed} (${elapsed}s)`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error('FATAL', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
