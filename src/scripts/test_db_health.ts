export {};

/**
 * Database health QA — safe, read-only.
 *
 * Run: npm run test:db   (or  npx tsx src/scripts/test_db_health.ts)
 *
 * Verifies PostgreSQL availability WITHOUT exposing credentials, hostnames,
 * or connection strings. Distinguishes:
 *   DATABASE_AVAILABLE   -> tests may run
 *   DATABASE_UNAVAILABLE -> PostgreSQL is down -> report BLOCKED
 *   DATABASE_TIMEOUT     -> slow/unreachable -> report BLOCKED
 *
 * This script NEVER modifies data and never prints secrets.
 */

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  const { checkDatabaseHealth } = await import('../lib/db/health');
  const result = await checkDatabaseHealth(5000);

  if (result.status === 'DATABASE_AVAILABLE') {
    console.log(`\n[PASS] DATABASE_AVAILABLE (latency ${result.latencyMs}ms)`);
    console.log('Database tests can run.\n');
    process.exit(0);
  }

  if (result.status === 'DATABASE_TIMEOUT') {
    console.log('\n[BLOCKED] DATABASE_TIMEOUT — PostgreSQL did not respond within the timeout window.');
    console.log('This is an infrastructure failure, not a code failure.');
    console.log('Start PostgreSQL and re-run: npm run test:db\n');
    process.exit(2);
  }

  console.log('\n[BLOCKED] DATABASE_UNAVAILABLE — PostgreSQL is not reachable.');
  console.log('This is an infrastructure failure, not a code failure.');
  console.log('Start PostgreSQL and re-run: npm run test:db\n');
  process.exit(2);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  // Never print driver details to the console — they can embed hostnames.
  console.error('[FAIL] Health probe errored unexpectedly (raw details withheld).');
  if (message.toLowerCase().includes('database_url')) {
    console.error('  DATABASE_URL is not configured — check .env / .env.local (values never printed).');
  }
  process.exit(1);
});