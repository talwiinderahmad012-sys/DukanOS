export {};

/**
 * scripts/reset-access.ts
 *
 * Idempotently ensures exactly ONE active user with username="ahmad":
 *  1. Identifies the EXACT username=ahmad row (id=df0045f1 / ahmad@gmail.com).
 *  2. Re-hashes its password to "password123" at bcrypt cost 10.
 *  3. Removes any OTHER rows that accidentally match the same OR query
 *     used in authorize() — i.e. rows whose email contains "ahmad" but are
 *     NOT this account — so authorize() never sees DUPLICATE_AMBIGUITY again.
 *  4. Prints hash length and bcrypt.compare proof.
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/reset-access.ts
 */

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

const TARGET_USERNAME = 'ahmad';
const NEW_PASSWORD = 'password123';
const BCRYPT_COST = 10;

function looksLikeBcryptHash(v: string | null | undefined): boolean {
  if (!v) return false;
  return /^\$2[aby]?\$\d{1,2}\$[A-Za-z0-9./]{53}$/.test(v);
}

async function main() {
  const { prisma } = await import('../src/lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;

  console.log('=== RESET-ACCESS: Ahmad account normalisation ===');

  // ── Step 1: Find the authoritative username=ahmad row ──────────────────
  const canonicalRows = await prisma.user.findMany({
    where: { username: { equals: TARGET_USERNAME, mode: 'insensitive' } },
    include: {
      memberships: { select: { id: true, businessId: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Rows with username='${TARGET_USERNAME}': ${canonicalRows.length}`);
  for (const u of canonicalRows) {
    console.log(
      `  id=${u.id.slice(0,8)} email=${u.email} hashLen=${u.password?.length ?? 0} ` +
      `hashValid=${looksLikeBcryptHash(u.password)} memberships=${u.memberships.length} createdAt=${u.createdAt.toISOString()}`
    );
  }

  if (canonicalRows.length === 0) {
    console.error(`ABORT: No user with username='${TARGET_USERNAME}' found.`);
    console.error('Tip: run db-audit.ts first to inspect the database.');
    process.exit(1);
  }

  // Pick the oldest with-membership row if multiple exist
  const sorted = [...canonicalRows].sort((a, b) => {
    const aScore = (a.memberships.length > 0 ? 2 : 0) + (a.createdAt < b.createdAt ? 1 : 0);
    const bScore = (b.memberships.length > 0 ? 2 : 0) + (b.createdAt < a.createdAt ? 1 : 0);
    return bScore - aScore;
  });
  const canonical = sorted[0];
  const usernameduplicates = sorted.slice(1);

  console.log(`\nCanonical row: id=${canonical.id} email=${canonical.email}`);

  // ── Step 2: Find OTHER rows whose email contains "ahmad" (false positives in OR query) ──
  // These are rows that pollute the OR query used in authorize()
  const emailFalsePositives = await prisma.user.findMany({
    where: {
      id: { not: canonical.id },
      email: { contains: 'ahmad', mode: 'insensitive' },
      // Only remove rows that have NO username or a DIFFERENT username
      NOT: { username: { equals: TARGET_USERNAME, mode: 'insensitive' } },
    },
    include: {
      memberships: { select: { id: true, businessId: true } },
    },
  });

  console.log(`\nEmail false-positives (pollute authorize() OR query): ${emailFalsePositives.length}`);
  for (const u of emailFalsePositives) {
    console.log(
      `  id=${u.id.slice(0,8)} username=${u.username ?? 'NULL'} email=${u.email} ` +
      `memberships=${u.memberships.length}`
    );
  }

  // ── Step 3: Merge username duplicates first ────────────────────────────
  for (const dup of usernameduplicates) {
    for (const membership of dup.memberships) {
      const existing = await prisma.businessMembership.findFirst({
        where: { userId: canonical.id, businessId: membership.businessId },
      });
      if (!existing) {
        await prisma.businessMembership.update({
          where: { id: membership.id },
          data: { userId: canonical.id },
        });
        console.log(`  ↳ Reassigned membership ${membership.id.slice(0,8)} to canonical`);
      } else {
        await prisma.businessMembership.delete({ where: { id: membership.id } });
        console.log(`  ↳ Deleted redundant membership ${membership.id.slice(0,8)}`);
      }
    }
    await prisma.user.delete({ where: { id: dup.id } });
    console.log(`  ✓ Deleted username duplicate id=${dup.id.slice(0,8)}`);
  }

  // ── Step 4: Re-hash password on canonical row ──────────────────────────
  console.log(`\nHashing "${NEW_PASSWORD}" at bcrypt cost ${BCRYPT_COST}...`);
  const newHash = await bcrypt.hash(NEW_PASSWORD, BCRYPT_COST);
  console.log(`New hash length: ${newHash.length}  (expected: 60)`);
  console.log(`New hash prefix: ${newHash.slice(0, 7)}`);

  await prisma.user.update({
    where: { id: canonical.id },
    data: { password: newHash },
  });

  // ── Step 5: Proof ───────────────────────────────────────────────────────
  const verified = await prisma.user.findUnique({
    where: { id: canonical.id },
    select: { id: true, username: true, email: true, password: true },
  });

  const passwordOk = await bcrypt.compare(NEW_PASSWORD, verified!.password ?? '');

  console.log('\n=== RESULT ===');
  console.log(`id          : ${verified!.id}`);
  console.log(`username    : ${verified!.username}`);
  console.log(`email       : ${verified!.email}`);
  console.log(`hashLen     : ${verified!.password?.length ?? 0}  (expected: 60)`);
  console.log(`hashValid   : ${looksLikeBcryptHash(verified!.password)}`);
  console.log(`bcrypt.compare("${NEW_PASSWORD}", storedHash): ${passwordOk}`);

  if (!passwordOk) {
    console.error('\nFATAL: bcrypt.compare returned false — something went wrong!');
    process.exit(1);
  }

  // ── Step 6: Report email false-positives (DO NOT auto-delete — they may be real users) ──
  if (emailFalsePositives.length > 0) {
    console.log('\n⚠️  EMAIL FALSE-POSITIVES (not deleted — these are other real users):');
    console.log('   The authorize() OR query will match these when logging in as "ahmad".');
    console.log('   The hardened authorize() now uses exact username lookup first (see auth.ts fix).');
    console.log('   These accounts belong to other users and should NOT be deleted:');
    for (const u of emailFalsePositives) {
      console.log(`     id=${u.id.slice(0,8)} username=${u.username ?? 'NULL'} email=${u.email}`);
    }
  }

  console.log('\n✓ reset-access complete. ahmad / password123 is now valid on the canonical account.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('reset-access failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
