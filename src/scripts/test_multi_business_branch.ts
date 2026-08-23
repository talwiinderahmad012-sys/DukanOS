export {};

// Load environment variables for standalone script
require('dotenv').config();

// Stub 'server-only' for standalone node execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  console.log('--- STARTING STEP 18: MULTI-BUSINESS & MULTI-BRANCH CONTEXT TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { 
    createBusinessForUser, 
    listUserBusinesses, 
    archiveBusiness, 
    transferBusinessOwnership 
  } = await import('../services/business/context');
  const { createSale } = await import('../services/sales');
  const { getBranchAnalytics } = await import('../services/analytics');
  const { MembershipRole, PaymentMethod } = await import('../generated/prisma/client');
  const bcrypt = await import('bcryptjs');

  // Clean test fixtures
  const testEmail1 = `owner.multibiz.${Date.now()}@dukaanos.local`;
  const testEmail2 = `member.multibiz.${Date.now()}@dukaanos.local`;
  const strangerEmail = `stranger.multibiz.${Date.now()}@dukaanos.local`;
  const hashedPassword = await bcrypt.hash('Secret123!', 10);

  const user1 = await prisma.user.create({
    data: {
      name: 'Ahmad MultiBiz Owner',
      email: testEmail1,
      password: hashedPassword,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Tariq Staff Member',
      email: testEmail2,
      password: hashedPassword,
    },
  });

  const strangerUser = await prisma.user.create({
    data: {
      name: 'Stranger User',
      email: strangerEmail,
      password: hashedPassword,
    },
  });

  console.log('✓ Initialized test users.');

  // ==========================================
  // Test 1: Atomic Multi-Business Creation
  // ==========================================
  console.log('\n--- Running Test 1: Atomic Multi-Business Creation ---');
  const biz1Result = await createBusinessForUser(user1.id, {
    name: 'Ahmad Mart Superstore',
    type: 'RETAIL',
    phone: '0300-1111111',
    address: 'Main Bazar',
    city: 'Multan',
    branchName: 'Headquarters',
    branchCode: 'HQ',
  });

  const biz2Result = await createBusinessForUser(user1.id, {
    name: 'Ahmad Wholesale Center',
    type: 'WHOLESALE',
    phone: '0300-2222222',
    address: 'Grain Market',
    city: 'Layyah',
    branchName: 'Central Depot',
    branchCode: 'DEPOT',
  });

  const user1Businesses = await listUserBusinesses(user1.id);
  if (user1Businesses.length !== 2) {
    throw new Error(`Expected 2 businesses for user1, found ${user1Businesses.length}`);
  }

  const mart = user1Businesses.find((b) => b.business.name === 'Ahmad Mart Superstore');
  const wholesale = user1Businesses.find((b) => b.business.name === 'Ahmad Wholesale Center');

  if (!mart || !wholesale) {
    throw new Error('Could not find created businesses in list.');
  }

  if (mart.role !== MembershipRole.OWNER || wholesale.role !== MembershipRole.OWNER) {
    throw new Error('User1 must be OWNER in both created businesses.');
  }

  console.log('✓ Test 1 Passed: Multi-business atomic creation and listing verified.');

  // ==========================================
  // Test 2: Multi-Branch Creation & Performance Aggregation
  // ==========================================
  console.log('\n--- Running Test 2: Multi-Branch Performance Aggregation ---');
  // Create second branch in Ahmad Mart
  const branch2 = await prisma.branch.create({
    data: {
      businessId: biz1Result.business.id,
      name: 'Kot Sultan Outlet',
      code: 'KOT',
      city: 'Kot Sultan',
      phone: '0300-3333333',
    },
  });

  // Create products in Ahmad Mart
  const product1 = await prisma.product.create({
    data: {
      businessId: biz1Result.business.id,
      name: 'Super Basmati Rice 5kg',
      sku: `RICE-${Date.now()}`,
      purchasePrice: 1000,
      sellingPrice: 1500,
      currentStock: 100,
    },
  });

  // Sale 1 in Branch 1 (HQ): 2 * 1500 = 3000
  await createSale({
    businessId: biz1Result.business.id,
    branchId: biz1Result.branch.id,
    userId: user1.id,
    paymentMethod: PaymentMethod.CASH,
    paidAmount: 3000,
    items: [
      {
        productId: product1.id,
        quantity: 2,
        sellingPrice: 1500,
      },
    ],
  });

  // Sale 2 in Branch 2 (Kot Sultan): 4 * 1500 = 6000
  await createSale({
    businessId: biz1Result.business.id,
    branchId: branch2.id,
    userId: user1.id,
    paymentMethod: PaymentMethod.CASH,
    paidAmount: 6000,
    items: [
      {
        productId: product1.id,
        quantity: 4,
        sellingPrice: 1500,
      },
    ],
  });

  const branchSummary = await getBranchAnalytics(biz1Result.business.id, new Date('2024-01-01'), new Date('2026-12-31'));
  if (branchSummary.length !== 2) {
    throw new Error(`Expected 2 branch summaries, got ${branchSummary.length}`);
  }

  const hqSummary = branchSummary.find((b: { branchCode: string; revenue: number; grossProfit: number }) => b.branchCode === 'HQ');
  const kotSummary = branchSummary.find((b: { branchCode: string; revenue: number; grossProfit: number }) => b.branchCode === 'KOT');

  if (!hqSummary || hqSummary.revenue !== 3000 || hqSummary.grossProfit !== 1000) {
    throw new Error(`HQ summary mismatch. Got ${JSON.stringify(hqSummary)}`);
  }

  if (!kotSummary || kotSummary.revenue !== 6000 || kotSummary.grossProfit !== 2000) {
    throw new Error(`Kot Sultan summary mismatch. Got ${JSON.stringify(kotSummary)}`);
  }

  console.log('✓ Test 2 Passed: Multi-branch sales and profit properly segregated and aggregated.');

  // ==========================================
  // Test 3: Cross-Tenant Isolation
  // ==========================================
  console.log('\n--- Running Test 3: Cross-Tenant Isolation ---');
  const strangerBusinesses = await listUserBusinesses(strangerUser.id);
  if (strangerBusinesses.length !== 0) {
    throw new Error('Stranger user must have 0 businesses initially.');
  }

  // Stranger attempts to access Ahmad Mart membership
  const unauthorizedMembership = await prisma.businessMembership.findUnique({
    where: {
      userId_businessId: {
        userId: strangerUser.id,
        businessId: biz1Result.business.id,
      },
    },
  });

  if (unauthorizedMembership !== null) {
    throw new Error('Stranger user must not have membership in Ahmad Mart.');
  }

  console.log('✓ Test 3 Passed: Cross-tenant isolation verified.');

  // ==========================================
  // Test 4: Business Archive / Status Safety
  // ==========================================
  console.log('\n--- Running Test 4: Business Archive & Status Enforcement ---');
  // Create a product in Business 2
  const ts = Date.now();
  const productBiz2 = await prisma.product.create({
    data: {
      businessId: biz2Result.business.id,
      name: `Wholesale Item ${ts}`,
      sku: `WS-${ts}`,
      purchasePrice: 800,
      sellingPrice: 1200,
      currentStock: 50,
    },
  });

  // Archive Wholesale Business
  const archivedBiz = await archiveBusiness(biz2Result.business.id, user1.id);
  if (archivedBiz.status !== 'ARCHIVED') {
    throw new Error(`Expected business status ARCHIVED, got ${archivedBiz.status}`);
  }

  // Attempt to create sale in archived business - must throw
  let saleBlocked = false;
  try {
    await createSale({
      businessId: biz2Result.business.id,
      branchId: biz2Result.branch.id,
      userId: user1.id,
      paymentMethod: PaymentMethod.CASH,
      items: [
        {
          productId: productBiz2.id,
          quantity: 1,
          sellingPrice: 1200,
        },
      ],
    });
  } catch (err: any) {
    if (err.message?.includes('ARCHIVED') || err.message?.includes('inactive')) {
      saleBlocked = true;
    } else {
      throw err;
    }
  }

  if (!saleBlocked) {
    throw new Error('Creating sale in an ARCHIVED business must be rejected.');
  }

  // Restore Business
  const restoredBiz = await archiveBusiness(biz2Result.business.id, user1.id);
  if (restoredBiz.status !== 'ACTIVE') {
    throw new Error(`Expected business status ACTIVE after restore, got ${restoredBiz.status}`);
  }

  console.log('✓ Test 4 Passed: Business archive successfully blocks transactions until restored.');

  // ==========================================
  // Test 5: Atomic Ownership Transfer
  // ==========================================
  console.log('\n--- Running Test 5: Atomic Ownership Transfer ---');
  // Attach user2 as member in Ahmad Mart
  await prisma.businessMembership.create({
    data: {
      businessId: biz1Result.business.id,
      userId: user2.id,
      role: MembershipRole.CASHIER,
    },
  });

  // Transfer ownership to user2
  await transferBusinessOwnership(
    biz1Result.business.id,
    user1.id,
    user2.id,
    MembershipRole.MANAGER
  );

  const membershipsAfterTransfer = await prisma.businessMembership.findMany({
    where: { businessId: biz1Result.business.id },
  });

  const oldOwnerMembership = membershipsAfterTransfer.find((m) => m.userId === user1.id);
  const newOwnerMembership = membershipsAfterTransfer.find((m) => m.userId === user2.id);

  if (newOwnerMembership?.role !== MembershipRole.OWNER) {
    throw new Error(`Expected user2 to be OWNER, got ${newOwnerMembership?.role}`);
  }

  if (oldOwnerMembership?.role !== MembershipRole.MANAGER) {
    throw new Error(`Expected user1 to be MANAGER, got ${oldOwnerMembership?.role}`);
  }

  // Verify exactly 1 active OWNER remains
  const ownerCount = membershipsAfterTransfer.filter((m) => m.role === MembershipRole.OWNER).length;
  if (ownerCount !== 1) {
    throw new Error(`Expected exactly 1 OWNER, found ${ownerCount}`);
  }

  console.log('✓ Test 5 Passed: Transactional ownership transfer completed safely.');

  console.log('\n🎉 ALL STEP 18 MULTI-BUSINESS & MULTI-BRANCH TESTS PASSED SUCCESSFULLY!\n');
}

main()
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  });
