export {};

/**
 * PWA / offline static QA — pure filesystem checks, no database required.
 *
 * Run: npm run test:pwa
 *
 * Verifies:
 *   1. public/sw.js exists and contains NO kill-switch
 *      (self.registration.unregister / clients.claim abuse).
 *   2. public/offline.html exists (navigation fallback).
 *   3. The service worker NEVER caches /api, /auth, or _next/data responses.
 *   4. RSC / Next.js fetch behavior is not intercepted (navigate => network-first).
 *   5. Offline IndexedDB queue module still exists and exports its queue API.
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${label}`);
  } else {
    failed += 1;
    console.error(`  [FAIL] ${label}`);
  }
}

const root = process.cwd();
const swPath = path.join(root, 'public', 'sw.js');
const offlinePath = path.join(root, 'public', 'offline.html');

function run() {
  console.log('--- PWA STATIC VERIFICATION ---');

  check(fs.existsSync(swPath), 'public/sw.js exists');
  check(fs.existsSync(offlinePath), 'public/offline.html exists');

  if (fs.existsSync(swPath)) {
    const sw = fs.readFileSync(swPath, 'utf8');

    check(!/self\.registration\.unregister\s*\(/.test(sw), 'service worker has NO kill-switch (unregister)');
    check(!/\.unregister\s*\(/.test(sw), 'service worker contains no unregister call anywhere');

    check(/url\.pathname\.startsWith\('\/api\'\)/.test(sw) || /url\.pathname\.startsWith\("\/api"\)/.test(sw),
      'service worker skips /api requests');
    check(/auth/.test(sw), 'service worker explicitly guards auth paths');

    check(/event\.request\.mode === 'navigate'/.test(sw), 'navigation is network-first (RSC-safe)');
    check(/caches\.match\(OFFLINE_URL\)|OFFLINE_URL/.test(sw), 'navigation falls back to offline.html');

    const forbiddenCacheTargets = ['/api/', '/auth/', '_next/data', '__nextjs_original-stack-frame'];
    for (const target of forbiddenCacheTargets) {
      check(
        !new RegExp(`(cache\\.put|cache\\.add).*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(sw),
        `service worker never caches ${target}`
      );
    }
  }

  if (fs.existsSync(offlinePath)) {
    const offline = fs.readFileSync(offlinePath, 'utf8');
    check(/<!doctype html>/i.test(offline) || /<html/i.test(offline), 'offline.html is a real HTML document');
  }

  // Offline IndexedDB queue must remain intact.
  const dbPath = path.join(root, 'src', 'lib', 'offline', 'db.ts');
  check(fs.existsSync(dbPath), 'offline IndexedDB queue module exists');
  if (fs.existsSync(dbPath)) {
    const db = fs.readFileSync(dbPath, 'utf8');
    check(/sync_queue/.test(db), 'IndexedDB sync_queue object store present');
    check(/enqueueSyncTransaction/.test(db), 'enqueueSyncTransaction API present');
    check(/processSyncQueue|getAllSyncQueue/.test(db), 'sync queue read API present');
  }

  const syncManagerPath = path.join(root, 'src', 'lib', 'offline', 'sync-manager.ts');
  check(fs.existsSync(syncManagerPath), 'offline sync-manager exists');
  if (fs.existsSync(syncManagerPath)) {
    const sm = fs.readFileSync(syncManagerPath, 'utf8');
    check(/clientTransactionId/.test(sm), 'offline sync passes clientTransactionId for idempotency');
  }

  console.log(`\n=== PWA RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run();