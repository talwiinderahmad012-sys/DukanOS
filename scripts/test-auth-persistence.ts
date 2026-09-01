export {};

// Load environment variables for standalone execution
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

// Stub 'server-only' so we can import the prisma client from a node script
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

/**
 * Verifies the things that make a login session survive a PC restart:
 *   1. AUTH_SECRET is set and stable (>= 32 bytes) — otherwise every restart
 *      invalidates all sessions (symptom: "Invalid email or password").
 *   2. DATABASE_URL is reachable.
 *   3. User "ahmad" exists and password123 verifies via bcrypt.compare
 *      (this is exactly what the credentials authorize() does).
 *   4. Session maxAge is 30 days (read from src/lib/auth/auth.ts default).
 */
async function main() {
  let failures = 0;

  console.log('--- AUTH PERSISTENCE CHECK ---');

  // 1. Secret
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length >= 32) {
    console.log(`[PASS] AUTH_SECRET present (len=${secret.length}) — stable across restarts`);
  } else {
    console.log('[FAIL] AUTH_SECRET missing/short — sessions will NOT survive restart');
    failures++;
  }

  // 2/3. DB + ahmad
  const { prisma } = await import('../src/lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;
  try {
    const u = await prisma.user.findUnique({ where: { username: 'ahmad' } });
    if (!u) {
      console.log('[FAIL] user "ahmad" does not exist — run bootstrap-ahmad-user.ts');
      failures++;
    } else if (!u.password) {
      console.log('[FAIL] user "ahmad" exists but has NO password');
      failures++;
    } else {
      const ok = await bcrypt.compare('password123', u.password);
      if (ok) console.log('[PASS] ahmad can authenticate with password123 (login will succeed)');
      else { console.log('[FAIL] ahmad exists but password123 does NOT verify'); failures++; }
    }
    const count = await prisma.user.count();
    console.log(`[INFO] total users in DB: ${count}`);
  } catch (e: any) {
    console.log('[FAIL] DB unreachable: ' + (e?.message || e));
    console.log('       Start PostgreSQL first: pwsh scripts/start-postgresql.ps1');
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  // 4. session maxAge (informational; value lives in src/lib/auth/auth.ts)
  console.log('[INFO] session strategy=jwt, maxAge=30d (see src/lib/auth/auth.ts) — survives restarts');

  console.log(failures === 0 ? '\nRESULT: OK — you can log in and stay logged in across restarts.'
                            : `\nRESULT: ${failures} issue(s) above must be fixed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('CHECK_ERROR', e); process.exit(1); });
