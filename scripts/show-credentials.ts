export {};

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

/**
 * Prints every user in the database (id, username, email, hasPassword) and
 * the known developer test credentials.
 */
async function main() {
  const { prisma } = await import('../src/lib/db/prisma');
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, name: true, password: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`USER_COUNT=${users.length}`);
    for (const u of users) {
      console.log(JSON.stringify({
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.name,
        hasPassword: !!u.password,
      }));
    }
    const ahmad = users.find((u: any) => u.username === 'ahmad');
    console.log('\n=== TEST CREDENTIALS ===');
    if (ahmad && ahmad.password) {
      console.log('  username : ahmad');
      console.log('  email    : ahmad@test.com');
      console.log('  password : password123');
    } else {
      console.log('  ahmad account not ready. Create it with: npx tsx scripts/bootstrap-ahmad-user.ts');
    }
  } catch (e: any) {
    console.error('DB_QUERY_FAILED', e?.message || e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
