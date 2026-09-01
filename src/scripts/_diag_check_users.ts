export {};

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  const { prisma } = await import('../lib/db/prisma');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      createdAt: true,
      memberships: { select: { id: true, role: true, businessId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`USER_COUNT=${users.length}`);
  for (const u of users) {
    console.log(JSON.stringify({
      id: u.id,
      email: u.email,
      name: u.name,
      hasPassword: !!u.password,
      passwordPrefix: u.password ? u.password.slice(0, 4) : null,
      members: u.memberships.map((m) => ({ businessId: m.businessId, role: m.role })),
    }));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('DB_CHECK_FAILED', e);
  process.exit(1);
});
