export {};

// Safe authentication diagnostic — prints ONLY safe metadata.
// Never prints: plaintext passwords, password hashes, secrets, or credentials.
//
// Usage:
//   npx tsx src/scripts/diag_auth.ts <user-email>
//
// Example output:
//   USER FOUND: YES
//   EMAIL NORMALIZED: YES
//   PASSWORD HASH PRESENT: YES
//   PASSWORD HASH FORMAT VALID: YES
//   USER ACTIVE: YES
//   MEMBERSHIP VALID: YES
//   AUTHORIZATION READY: YES

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function looksLikeBcryptHash(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^\$2[aby]?\$\d{1,2}\$[A-Za-z0-9./]{53}$/.test(value);
}

async function main() {
  const targetEmail = normalizeEmail(process.argv[2] || '');
  if (!targetEmail) {
    console.error('Usage: npx tsx src/scripts/diag_auth.ts <user-email>');
    process.exit(1);
  }

  const { prisma } = await import('../lib/db/prisma');

  const dbUrl = process.env.DATABASE_URL || '';
  const dbName = dbUrl.match(/\/([^?]+)/)?.[1] || 'unknown';
  const dbHost = dbUrl.match(/@([^:/]+)/)?.[1] || 'unknown';
  const dbPort = dbUrl.match(/:(\d+)\//)?.[1] || 'unknown';

  console.log('--- AUTH DIAGNOSTIC ---');
  console.log(`TARGET EMAIL: ${targetEmail}`);
  console.log(`DATABASE HOST: ${dbHost}`);
  console.log(`DATABASE NAME: ${dbName}`);
  console.log(`DATABASE PORT: ${dbPort}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`);
  console.log('');

  const user = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } },
    select: { id: true, email: true, name: true, password: true },
  });

  console.log(`USER FOUND: ${user ? 'YES' : 'NO'}`);
  if (!user) {
    console.log('\nNOTE: No user with this email exists in the database.');
    await prisma.$disconnect();
    return;
  }

  const storedNormalized = normalizeEmail(user.email ?? '');
  console.log(`EMAIL NORMALIZED: ${storedNormalized === targetEmail ? 'YES' : 'NO'} (stored="${user.email}")`);
  console.log(`PASSWORD HASH PRESENT: ${user.password ? 'YES' : 'NO'}`);
  console.log(`PASSWORD HASH FORMAT VALID: ${looksLikeBcryptHash(user.password) ? 'YES' : 'NO'}`);

  const membership = await prisma.businessMembership.findFirst({
    where: { userId: user.id },
    include: { business: { select: { id: true, name: true, status: true } } },
  });

  console.log(`MEMBERSHIP VALID: ${membership ? 'YES' : 'NO'}`);
  if (membership) {
    console.log(`  BUSINESS: ${membership.business.name} (status: ${membership.business.status})`);
    console.log(`  ROLE: ${membership.role}`);
  }

  const authReady =
    user.password &&
    looksLikeBcryptHash(user.password) &&
    membership !== null;

  console.log(`AUTHORIZATION READY: ${authReady ? 'YES' : 'NO'}`);

  if (!authReady) {
    console.log('\nNOTE: Authorization cannot proceed. Possible causes:');
    if (!user.password) console.log('  - User has no password set (OAuth-only account?)');
    if (!looksLikeBcryptHash(user.password)) console.log('  - Password hash format is invalid or corrupted');
    if (!membership) console.log('  - User has no business membership');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Diagnostic failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
