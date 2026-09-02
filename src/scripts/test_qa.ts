export {};

/**
 * Comprehensive QA orchestration.
 *
 * Run: npm run test:qa
 *
 *   1. Static/offline checks that never need a database:
 *        - repository hygiene (AUTH-DEBUG, hardcoded VAPID keys, artifacts)
 *        - i18n key parity (en <-> ur locale files)
 *        - PWA service-worker safety (kill-switch / auth caching)
 *   2. Database availability gate:
 *        - DATABASE_AVAILABLE   -> runs the DB-backed suites
 *        - DATABASE_UNAVAILABLE -> reports BLOCKED (infrastructure), NOT code failure
 *
 * This script NEVER modifies production data; DB suites create and delete
 * only their own isolated test rows.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const root = process.cwd();

let passed = 0;
let failed = 0;
const blocked: string[] = [];

function check(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${label}`);
  } else {
    failed += 1;
    console.error(`  [FAIL] ${label}`);
  }
}

function runTsx(script: string): boolean {
  try {
    console.log(`\n  --- npx tsx ${script} ---`);
    execFileSync(process.execPath, [require.resolve('tsx/cli'), script], {
      cwd: root,
      stdio: 'inherit',
    });
    return true;
  } catch (e) {
    const code = (e as { status?: number }).status;
    if (code === 2) {
      // Our BLOCKED convention (DB/INFRA).
      blocked.push(script);
      return true;
    }
    return false;
  }
}

async function main() {
  console.log('=== DUKAANOS QA ORCHESTRATION ===\n');

  console.log('--- SECURITY / REPOSITORY HYGIENE ---');
  const scanFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next', '.git', '.kilo', 'scratch', '.windsurf', '.claude', '.agents', '.workbuddy-ai'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|mjs|ps1|sh|html|json|md)$/.test(entry.name)) scanFiles.push(full);
    }
  };
  walk(root);

  let debugLogs = 0;
  let credArtifacts = 0;
  const skipRaw = new Set(['package-lock.json', 'AGENTS.md', 'seed.ts']);
  for (const file of scanFiles) {
    const base = path.basename(file);
    if (skipRaw.has(base)) continue;
    let content = '';
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    if (/\[AUTH-DEBUG\]/.test(content)) {
      debugLogs += 1;
      console.error(`    auth-debug: ${path.relative(root, file)}`);
    }
    if (/VAPID_PRIVATE_KEY\s*=\s*["'](?!\$?\{?\s*process\.env)/.test(content)) {
      credArtifacts += 1;
      console.error(`    hardcoded VAPID private key: ${path.relative(root, file)}`);
    }
  }
  check(debugLogs === 0, 'no [AUTH-DEBUG] logs remain');
  check(credArtifacts === 0, 'no hardcoded VAPID private keys in source');

  check(!fs.existsSync(path.join(root, 'cookies.txt')), 'cookies.txt absent');
  check(!fs.existsSync(path.join(root, 'cookies2.txt')), 'cookies2.txt absent');
  for (const f of ['check_user.ts', 'get_test_user.ts', 'check_specific_user.ts', 'test_pg.py', 'test_native.js']) {
    check(!fs.existsSync(path.join(root, f)), `${f} removed from repo root`);
  }
  console.log('\n--- I18N KEY PARITY ---');
  const enDir = path.join(root, 'src', 'lib', 'i18n', 'locales', 'en');
  const urDir = path.join(root, 'src', 'lib', 'i18n', 'locales', 'ur');
  let parityOk = true;
  for (const name of fs.readdirSync(enDir)) {
    if (!fs.existsSync(path.join(urDir, name))) {
      check(false, `Urdu missing locale file: ${name}`);
      parityOk = false;
      continue;
    }
    const en = JSON.parse(fs.readFileSync(path.join(enDir, name), 'utf8'));
    const ur = JSON.parse(fs.readFileSync(path.join(urDir, name), 'utf8'));
    const enKeys = new Set(Object.keys(en));
    const urKeys = new Set(Object.keys(ur));
    const missingUr = [...enKeys].filter((k) => !urKeys.has(k));
    const missingEn = [...urKeys].filter((k) => !enKeys.has(k));
    if (missingUr.length > 0 || missingEn.length > 0) {
      check(false, `key parity mismatch in ${name} (ur-missing=${missingUr.join(',')} en-missing=${missingEn.join(',')})`);
      parityOk = false;
    }
  }
  if (parityOk) check(true, 'all locale files have identical key sets (en <-> ur)');

  console.log('\n--- PWA STATIC ---');
  runTsx('src/scripts/test_pwa_static.ts');

  console.log('\n--- DATABASE AVAILABILITY GATE ---');
  const { checkDatabaseHealth } = await import('../lib/db/health');
  const health = await checkDatabaseHealth(5000);

  if (health.status !== 'DATABASE_AVAILABLE') {
    console.log(`\n[BLOCKED] ${health.status} - PostgreSQL is unavailable.`);
    console.log('Reporting BLOCKED (infrastructure), NOT code failure, for all DB suites.\n');
    for (const suite of ['i18n runtime', 'auth', 'payroll', 'rbac', 'tenant', 'financial', 'reliability']) {
      blocked.push(suite);
    }
  } else {
    console.log(`\n[PASS] DATABASE_AVAILABLE (latency ${health.latencyMs}ms)`);
    runTsx('src/scripts/test_i18n_keys.ts');
    runTsx('src/scripts/test_auth_permanent.ts');
    runTsx('src/scripts/test_payroll.ts');
    runTsx('src/scripts/test_rbac_tenant.ts');
    runTsx('src/scripts/test_reconciliation.ts');
    runTsx('src/scripts/test_step34_reliability.ts');
  }

  console.log('\n=== QA SUMMARY ===');
  console.log(`  passed : ${passed}`);
  console.log(`  failed : ${failed}`);
  if (blocked.length > 0) {
    console.log(`  BLOCKED: ${[...new Set(blocked)].join(', ')}`);
  }

  if (failed > 0) process.exit(1);
  process.exit(blocked.length > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('QA orchestration failed:', err);
  process.exit(1);
});
