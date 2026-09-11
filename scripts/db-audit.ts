export {};

// DB audit script — prints safe metadata only, never prints hashes/secrets.
require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

function looksLikeBcryptHash(v: string | null | undefined): boolean {
  if (!v) return false;
  return /^\$2[aby]?\$\d{1,2}\$[A-Za-z0-9./]{53}$/.test(v);
}

async function main() {
  const { prisma } = await import('../src/lib/db/prisma');

  console.log('=== DB USER AUDIT ===');

  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, createdAt: true, password: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total users in database: ${users.length}`);
  console.log('');

  for (const u of users) {
    const hashLen = u.password ? u.password.length : 0;
    const hashValid = looksLikeBcryptHash(u.password);
    const isAhmad =
      u.username?.toLowerCase() === 'ahmad' ||
      u.email?.toLowerCase().includes('ahmad');

    console.log(
      `[${isAhmad ? '*** AHMAD ***' : '         '}] ` +
      `id=${u.id.slice(0, 8)} | ` +
      `username=${u.username ?? 'NULL'} | ` +
      `email=${u.email ?? 'NULL'} | ` +
      `hashLen=${hashLen} | ` +
      `hashValid=${hashValid} | ` +
      `createdAt=${u.createdAt.toISOString()}`
    );
  }

  console.log('');
  const ahmadRows = users.filter(
    (u) =>
      u.username?.toLowerCase() === 'ahmad' ||
      u.email?.toLowerCase().includes('ahmad')
  );

  console.log(`Ahmad-matching rows: ${ahmadRows.length}`);

  if (ahmadRows.length === 0) {
    console.log('CLASSIFICATION: USER_NOT_FOUND');
  } else if (ahmadRows.length > 1) {
    console.log('CLASSIFICATION: DUPLICATE_AMBIGUITY');
  } else {
    const u = ahmadRows[0];
    const h = u.password ?? '';
    if (!h) {
      console.log('CLASSIFICATION: USER_NOT_FOUND (no password set)');
    } else if (h.length !== 60) {
      console.log(`CLASSIFICATION: HASH_TRUNCATED (length=${h.length}, expected=60)`);
    } else if (!looksLikeBcryptHash(h)) {
      console.log('CLASSIFICATION: HASH_TRUNCATED (invalid bcrypt format)');
    } else {
      console.log('CLASSIFICATION: PASSWORD_MISMATCH (hash is valid 60-char bcrypt, wrong password supplied)');
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Audit failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
