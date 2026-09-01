export {};

// Load environment variables for standalone execution (.env then .env.local)
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

// Stub 'server-only' so we can import the prisma client from a node script
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

/**
 * Bootstrap (or repair) the developer account "ahmad".
 *
 * This is the PRIMARY fix for the "Invalid email or password" error:
 * the credentials provider returns null (=> that error) when the user row
 * is missing or has no/incorrect password. This script guarantees ahmad
 * exists with a known password.
 *
 * Credentials produced:
 *   username : ahmad
 *   email    : ahmad@test.com
 *   password : password123
 */
async function main() {
  const { prisma } = await import('../src/lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;
  const { BusinessType, BusinessStatus, MembershipRole } = await import('../src/generated/prisma/client');

  const username = 'ahmad';
  const email = 'ahmad@test.com';
  const password = 'password123';

  let existing = await prisma.user.findUnique({ where: { username } }).catch(() => null);

  if (existing && existing.password) {
    // User already has a password — verify it matches, otherwise repair it.
    const ok = await bcrypt.compare(password, existing.password);
    if (ok) {
      console.log('OK user "ahmad" already exists with the expected password. Nothing to do.');
    } else {
      console.log('REPAIR user "ahmad" exists but password mismatch — resetting to known value.');
      await prisma.user.update({
        where: { username },
        data: { password: await bcrypt.hash(password, 10), emailVerified: new Date() },
      });
    }
    // Fall through — the business/membership/branch ensure below must run
    // for every path (create, repair, and already-OK).
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashed,
      email: existing?.email ?? email,
      emailVerified: new Date(),
      name: existing?.name ?? 'Ahmad',
    },
    create: {
      username,
      email,
      name: 'Ahmad',
      password: hashed,
      emailVerified: new Date(),
    },
  });

  console.log(`CREATED/UPDATED user id=${user.id} username=${user.username} email=${user.email}`);

  // Ensure ahmad has an active business + OWNER membership + branch so the
  // dashboard loads immediately after login (all idempotent, fixed ids).
  const business = await prisma.business.upsert({
    where: { id: 'ahmad-primary-business-0001' },
    update: { status: BusinessStatus.ACTIVE },
    create: {
      id: 'ahmad-primary-business-0001',
      name: "Ahmad's Store",
      type: BusinessType.RETAIL,
      status: BusinessStatus.ACTIVE,
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      city: 'Lahore',
      country: 'Pakistan',
    },
  });

  await prisma.businessMembership.upsert({
    where: { userId_businessId: { userId: user.id, businessId: business.id } },
    update: { role: MembershipRole.OWNER },
    create: { userId: user.id, businessId: business.id, role: MembershipRole.OWNER },
  });

  await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: 'MAIN' } },
    update: { name: 'Main Branch' },
    create: { businessId: business.id, name: 'Main Branch', code: 'MAIN', city: 'Lahore' },
  });

  console.log(`BUSINESS ${business.name} (${business.id}) with OWNER membership + Main Branch ensured.`);

  console.log('CREDENTIALS username=ahmad password=password123');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('BOOTSTRAP_FAILED', err);
  console.error('Hint: is PostgreSQL running? Run: pwsh scripts/start-postgresql.ps1');
  process.exit(1);
});
