export {};

// Load environment variables for standalone execution
require('dotenv').config();

// Stub 'server-only' for standalone node script execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  console.log('--- DUKAANOS PRODUCTION BOOTSTRAP WIZARD ---');

  const { prisma } = await import('../lib/db/prisma');
  const { createBusinessForUser } = await import('../services/business/context');
  const bcrypt = (await import('bcryptjs')).default;

  const email = process.env.BOOTSTRAP_OWNER_EMAIL || process.argv[2];
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD || process.argv[3];
  const name = process.env.BOOTSTRAP_OWNER_NAME || process.argv[4] || 'Store Owner';
  const storeName = process.env.BOOTSTRAP_STORE_NAME || process.argv[5] || 'Main Retail Store';

  if (!email || !password) {
    console.error('\nUsage: npx tsx src/scripts/bootstrap_owner.ts <email> <password> [ownerName] [storeName]');
    console.error('Or provide BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD in environment.\n');
    process.exit(1);
  }

  // 1. Verify user does not already exist
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`\nError: User with email "${email}" already exists in database.`);
    process.exit(1);
  }

  // 2. Create User
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  // 3. Create Business, Branch, Settings & Owner Membership Atomically
  const result = await createBusinessForUser(user.id, {
    name: storeName,
    type: 'RETAIL',
    branchName: 'Main Branch',
    branchCode: 'MAIN',
  });

  console.log('\n✓ PRODUCTION BOOTSTRAP SUCCESSFUL!');
  console.log(`- Owner Account: ${user.email} (${user.name})`);
  console.log(`- Business: ${result.business.name} (ID: ${result.business.id})`);
  console.log(`- Primary Branch: ${result.branch.name} (Code: ${result.branch.code})`);
  console.log('\nYou can now log in at your production domain.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
