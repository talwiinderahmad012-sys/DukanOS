export {};

// Load environment variables for standalone script
require('dotenv').config();

// Dynamically stub 'server-only' for standalone node execution
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function runTests() {
  console.log('--- STARTING STEP 9: REPORTS, ANALYTICS & BUSINESS ADVISOR INTEGRATION TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { SaleStatus, PurchaseStatus, MovementType, NotificationSeverity } = await import('../generated/prisma/client');
  const { 
    getDailyReport, 
    getWeeklyReport, 
    getMonthlyReport, 
    getYearlyReport, 
    getTopSellingProducts, 
    getSlowMovingProducts,
    getBusinessGrowth 
  } = await import('../services/reports');
  const { 
    generateAdvisorFindings, 
    syncAdvisorNotifications 
  } = await import('../services/advisor');
  const { calculateGrowth } = await import('../lib/utils/date-utils');

  const timestamp = Date.now();
  const testEmailA = `test-advisor-owner-a-${timestamp}@example.com`;
  const testEmailB = `test-advisor-owner-b-${timestamp}@example.com`;

  // 1. Create Test Businesses
  const userA = await prisma.user.create({
    data: { name: 'Advisor Owner A', email: testEmailA },
  });

  const bizA = await prisma.business.create({
    data: {
      name: `Advisor Store A ${timestamp}`,
      memberships: {
        create: { userId: userA.id, role: 'OWNER' },
      },
    },
  });

  const userB = await prisma.user.create({
    data: { name: 'Advisor Owner B', email: testEmailB },
  });

  const bizB = await prisma.business.create({
    data: {
      name: `Advisor Store B ${timestamp}`,
      memberships: {
        create: { userId: userB.id, role: 'OWNER' },
      },
    },
  });

  console.log('✓ Initialized test businesses and users.');

  // 2. Create Products with various stock levels
  const prodFast = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Super Fast Soda',
      sku: `SFS-${timestamp}`,
      currentStock: 100,
      minStockThreshold: 10,
      purchasePrice: 50,
      sellingPrice: 100,
    },
  });

  const prodLowStock = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Low Stock Chips',
      sku: `LSC-${timestamp}`,
      currentStock: 3, // <= minStockThreshold (5)
      minStockThreshold: 5,
      purchasePrice: 30,
      sellingPrice: 60,
    },
  });

  const prodOutOfStock = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Out of Stock Juice',
      sku: `OSJ-${timestamp}`,
      currentStock: 0,
      minStockThreshold: 10,
      purchasePrice: 80,
      sellingPrice: 150,
    },
  });

  const prodSlow = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Slow Moving Blender',
      sku: `SMB-${timestamp}`,
      currentStock: 10,
      minStockThreshold: 2,
      purchasePrice: 2000,
      sellingPrice: 3500,
    },
  });

  // 3. Create Customer with Credit
  const customerA = await prisma.customer.create({
    data: {
      businessId: bizA.id,
      name: 'Tariq Mehmood',
      phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
      outstanding: 5000, // Credit balance
    },
  });

  // 4. Record Sales (Completed & Cancelled)
  // Sale 1: Completed (10x Fast Soda = 1000 rev, 500 profit)
  const sale1 = await prisma.sale.create({
    data: {
      businessId: bizA.id,
      invoiceNumber: `INV-TEST1-${timestamp}`,
      subtotal: 1000,
      discount: 0,
      total: 1000,
      paidAmount: 800, // 200 credit
      status: SaleStatus.COMPLETED,
      items: {
        create: {
          productId: prodFast.id,
          quantity: 10,
          sellingPrice: 100,
          costPrice: 50,
          discount: 0,
          lineTotal: 1000,
          lineProfit: 500,
        },
      },
    },
  });

  // Sale 2: Cancelled (Should be excluded from all metrics)
  await prisma.sale.create({
    data: {
      businessId: bizA.id,
      invoiceNumber: `INV-CANCELLED-${timestamp}`,
      subtotal: 5000,
      discount: 0,
      total: 5000,
      paidAmount: 5000,
      status: SaleStatus.CANCELLED,
      items: {
        create: {
          productId: prodFast.id,
          quantity: 50,
          sellingPrice: 100,
          costPrice: 50,
          discount: 0,
          lineTotal: 5000,
          lineProfit: 2500,
        },
      },
    },
  });

  // 5. Record Expenses
  await prisma.expense.create({
    data: {
      businessId: bizA.id,
      category: 'Utilities',
      amount: 150,
      description: 'Shop electricity bill',
    },
  });

  // 6. Record Customer Debt Payment
  await prisma.customerPayment.create({
    data: {
      businessId: bizA.id,
      customerId: customerA.id,
      amount: 500,
    },
  });

  // --- TEST 1: Daily Report Calculations & Exclusion of Cancelled Sales ---
  console.log('\n--- Running Test 1: Daily Report Audit & Exclusion of Cancelled Sales ---');
  const dailyReport = await getDailyReport(bizA.id);

  if (dailyReport.summary.grossRevenue !== 1000) {
    throw new Error(`Expected gross revenue 1000 (excluding cancelled sale), got ${dailyReport.summary.grossRevenue}`);
  }
  if (dailyReport.summary.grossProfit !== 500) {
    throw new Error(`Expected gross profit 500, got ${dailyReport.summary.grossProfit}`);
  }
  if (dailyReport.summary.expenses !== 150) {
    throw new Error(`Expected expenses 150, got ${dailyReport.summary.expenses}`);
  }
  if (dailyReport.summary.netProfit !== 350) { // 500 - 150
    throw new Error(`Expected net profit 350, got ${dailyReport.summary.netProfit}`);
  }
  if (dailyReport.summary.creditGiven !== 200) { // 1000 - 800
    throw new Error(`Expected credit given 200, got ${dailyReport.summary.creditGiven}`);
  }
  if (dailyReport.summary.paymentsReceived !== 500) {
    throw new Error(`Expected payments received 500, got ${dailyReport.summary.paymentsReceived}`);
  }
  console.log('✓ Test 1 Passed: Daily report computed revenue, gross profit, expenses, net profit, and credit accurately while excluding cancelled transactions.');

  // --- TEST 2: Growth Engine & Safe Zero Baseline ---
  console.log('\n--- Running Test 2: Growth Engine & Safe Zero Baseline ---');
  const growthPos = calculateGrowth(120, 100);
  if (growthPos.percentage !== 20 || growthPos.status !== 'UP') {
    throw new Error(`Expected +20% UP, got ${JSON.stringify(growthPos)}`);
  }

  const growthNeg = calculateGrowth(80, 100);
  if (growthNeg.percentage !== -20 || growthNeg.status !== 'DOWN') {
    throw new Error(`Expected -20% DOWN, got ${JSON.stringify(growthNeg)}`);
  }

  const growthZeroBaseline = calculateGrowth(50, 0);
  if (growthZeroBaseline.percentage !== null || growthZeroBaseline.status !== 'NO_BASELINE') {
    throw new Error(`Expected NO_BASELINE without NaN/Infinity, got ${JSON.stringify(growthZeroBaseline)}`);
  }
  console.log('✓ Test 2 Passed: Growth engine calculated positive, negative, and zero-baseline growth safely without NaN/Infinity.');

  // --- TEST 3: Top-Selling & Slow-Moving Products ---
  console.log('\n--- Running Test 3: Top-Selling & Slow-Moving Product Algorithms ---');
  const topProducts = await getTopSellingProducts(bizA.id, { limit: 5 });
  if (topProducts.length === 0 || topProducts[0].productId !== prodFast.id || topProducts[0].quantitySold !== 10) {
    throw new Error(`Expected top product to be Super Fast Soda with 10 sold, got ${JSON.stringify(topProducts)}`);
  }

  const slowProducts = await getSlowMovingProducts(bizA.id, { daysThreshold: 30, limit: 10 });
  const slowIds = slowProducts.map((p) => p.productId);
  if (!slowIds.includes(prodSlow.id)) {
    throw new Error(`Expected Slow Moving Blender to be in slow products list, got ${JSON.stringify(slowProducts)}`);
  }
  if (slowIds.includes(prodFast.id)) {
    throw new Error(`Super Fast Soda has sales and must NOT be in slow products list!`);
  }
  console.log('✓ Test 3 Passed: Top-selling ranked correctly by velocity and slow-moving correctly detected untouched inventory.');

  // --- TEST 4: Business Advisor Rules & Health Score ---
  console.log('\n--- Running Test 4: Business Advisor Deterministic Rules & Health Score ---');
  const advisorData = await generateAdvisorFindings(bizA.id);
  const findingTypes = advisorData.findings.map((f) => f.type);

  if (!findingTypes.includes('OUT_OF_STOCK')) {
    throw new Error(`Expected OUT_OF_STOCK finding for Out of Stock Juice!`);
  }
  if (!findingTypes.includes('LOW_STOCK')) {
    throw new Error(`Expected LOW_STOCK finding for Low Stock Chips!`);
  }
  if (!findingTypes.includes('SLOW_MOVING')) {
    throw new Error(`Expected SLOW_MOVING finding for Slow Moving Blender!`);
  }

  const score = advisorData.healthScore.score;
  if (typeof score !== 'number' || score < 0 || score > 100) {
    throw new Error(`Invalid health score: ${score}`);
  }
  if (advisorData.healthScore.factors.length !== 5) {
    throw new Error(`Expected 5 health score pillars, got ${advisorData.healthScore.factors.length}`);
  }
  console.log(`✓ Test 4 Passed: Business Advisor triggered rules accurately (score: ${score}/100, grade: ${advisorData.healthScore.grade}).`);

  // --- TEST 5: Deduplicated Owner Notifications ---
  console.log('\n--- Running Test 5: Deduplicated Owner Notifications ---');
  const sync1 = await syncAdvisorNotifications(bizA.id);
  if (sync1.createdNotifications === 0) {
    throw new Error(`Expected notifications to be created on first sync, got 0`);
  }

  // Re-run sync immediately - must NOT create duplicate notifications
  const sync2 = await syncAdvisorNotifications(bizA.id);
  if (sync2.createdNotifications !== 0) {
    throw new Error(`Expected 0 duplicate notifications created on second sync, got ${sync2.createdNotifications}`);
  }
  console.log(`✓ Test 5 Passed: Created ${sync1.createdNotifications} notifications on first run and 0 duplicates on second run.`);

  // --- TEST 6: Tenant Isolation ---
  console.log('\n--- Running Test 6: Multi-Tenant Security & Isolation ---');
  const dailyReportB = await getDailyReport(bizB.id);
  if (dailyReportB.summary.grossRevenue !== 0 || dailyReportB.summary.ordersCount !== 0) {
    throw new Error(`Tenant leak! Business B saw Business A sales.`);
  }
  console.log('✓ Test 6 Passed: Tenant isolation verified. Business B cannot see Business A transactions.');

  console.log('\n🎉 ALL STEP 9 REPORTS, ANALYTICS & ADVISOR TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
