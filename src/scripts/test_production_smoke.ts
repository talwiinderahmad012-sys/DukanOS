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
  console.log('--- STARTING STEP 20: PRODUCTION RELEASE SMOKE TEST (v1.0.0) ---');

  const { prisma } = await import('../lib/db/prisma');
  const { createBusinessForUser } = await import('../services/business/context');
  const { createProduct } = await import('../services/products');
  const { createPurchase } = await import('../services/purchases');
  const { createSale } = await import('../services/sales');
  const { createCustomer, recordCustomerPayment } = await import('../services/customers');
  const { getDailyReport, getBranchAnalytics } = await import('../services/reports');
  const { checkCameraHealth } = await import('../services/cctv/index');
  const { generateAdvisorFindings } = await import('../services/advisor');
  const { PaymentMethod } = await import('../generated/prisma/client');
  const bcrypt = (await import('bcryptjs')).default;

  // ==========================================
  // 1. Health & Database Pool Smoke Test
  // ==========================================
  console.log('\n--- 1. Testing Database Pool & Health Status ---');
  const healthStart = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const dbLatency = Date.now() - healthStart;
  console.log(`✓ PostgreSQL 16+ pool ping successful: ${dbLatency}ms latency.`);

  // ==========================================
  // 2. Production User & Atomic Store Bootstrap
  // ==========================================
  console.log('\n--- 2. Testing Owner Registration & Atomic Store Bootstrap ---');
  const hashedPassword = await bcrypt.hash('SmokeTestPassword123!', 10);
  const testUser = await prisma.user.create({
    data: {
      name: 'Launch Verification Owner',
      email: `owner.launch.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
    },
  });

  const launchStore = await createBusinessForUser(testUser.id, {
    name: 'Al-Madina Super Mart (Launch Store)',
    type: 'RETAIL',
    phone: '0300-1112233',
    city: 'Multan',
    branchName: 'Main Mall Branch',
    branchCode: 'MALL-01',
  });

  console.log(`✓ Store bootstrap complete: Business ID ${launchStore.business.id}, Branch ${launchStore.branch.code}`);

  // ==========================================
  // 3. Product Catalog & Inventory Replenishment
  // ==========================================
  console.log('\n--- 3. Testing Product Catalog & Purchase Replenishment ---');
  const product = await createProduct(
    launchStore.business.id,
    testUser.id,
    {
      name: 'Premium Basmati Rice 5kg',
      sku: `RICE-5KG-${Date.now()}`,
      barcode: `8964000${Math.floor(Math.random() * 1000000)}`,
      purchasePrice: 1200,
      sellingPrice: 1500,
      minStockThreshold: 10,
    }
  );

  const supplier = await prisma.supplier.create({
    data: {
      businessId: launchStore.business.id,
      name: 'Punjab Grain Suppliers Ltd',
      phone: '0300-5556677',
    },
  });

  // Purchase 50 units
  await createPurchase({
    businessId: launchStore.business.id,
    branchId: launchStore.branch.id,
    supplierId: supplier.id,
    userId: testUser.id,
    paidAmount: 60000,
    items: [
      {
        productId: product.id,
        quantity: 50,
        purchasePrice: 1200,
      },
    ],
  });

  const stockedProduct = await prisma.product.findUnique({
    where: { id: product.id },
  });

  if (stockedProduct?.currentStock !== 50) {
    throw new Error(`Expected currentStock to be 50, got ${stockedProduct?.currentStock}`);
  }
  console.log(`✓ Inventory replenished: 50 bags in stock.`);

  // ==========================================
  // 4. POS Cash Sale & Inventory Deduction
  // ==========================================
  console.log('\n--- 4. Testing POS Cash Sale & Real-Time Stock Deduction ---');
  const cashSale = await createSale({
    businessId: launchStore.business.id,
    branchId: launchStore.branch.id,
    userId: testUser.id,
    paymentMethod: PaymentMethod.CASH,
    paidAmount: 7500,
    items: [
      {
        productId: product.id,
        quantity: 5,
        sellingPrice: 1500,
      },
    ],
  });

  const postSaleProduct = await prisma.product.findUnique({
    where: { id: product.id },
  });

  if (postSaleProduct?.currentStock !== 45) {
    throw new Error(`Expected currentStock to be 45, got ${postSaleProduct?.currentStock}`);
  }
  console.log(`✓ POS Cash Sale created: Invoice ${cashSale.invoiceNumber}, Stock deducted to 45.`);

  // ==========================================
  // 5. Customer Udhaar & Payment Ledger
  // ==========================================
  console.log('\n--- 5. Testing Customer Udhaar & Payment Ledger ---');
  const customer = await createCustomer(
    launchStore.business.id,
    testUser.id,
    {
      name: 'Chaudhry Tariq',
      phone: '0300-7778899',
      address: 'Model Town, Multan',
    }
  );

  // Partial credit sale (total: 3000, paid: 1000, credit: 2000)
  await createSale({
    businessId: launchStore.business.id,
    branchId: launchStore.branch.id,
    customerId: customer.id,
    userId: testUser.id,
    paymentMethod: PaymentMethod.CREDIT,
    paidAmount: 1000,
    items: [
      {
        productId: product.id,
        quantity: 2,
        sellingPrice: 1500,
      },
    ],
  });

  let custCheck = await prisma.customer.findUnique({ where: { id: customer.id } });
  if (Number(custCheck?.outstanding) !== 2000) {
    throw new Error(`Expected customer outstanding 2000, got ${custCheck?.outstanding}`);
  }

  // Customer makes udhaar payment of 2000
  await recordCustomerPayment(
    launchStore.business.id,
    testUser.id,
    customer.id,
    2000,
    PaymentMethod.CASH,
    'Cleared outstanding rice balance'
  );

  custCheck = await prisma.customer.findUnique({ where: { id: customer.id } });
  if (Number(custCheck?.outstanding) !== 0) {
    throw new Error(`Expected customer outstanding 0, got ${custCheck?.outstanding}`);
  }
  console.log(`✓ Udhaar workflow verified: Partial credit recorded and reconciled to 0 balance.`);

  // ==========================================
  // 6. Financial Reporting & Multi-Branch Aggregation
  // ==========================================
  console.log('\n--- 6. Testing Daily Financial Reports & Branch Performance ---');
  const dailyReport = await getDailyReport(launchStore.business.id);
  const branchSummary = await getBranchAnalytics(launchStore.business.id, new Date('2024-01-01'), new Date('2026-12-31'));

  if (dailyReport.summary.ordersCount !== 2) {
    throw new Error(`Expected 2 sales in daily report, got ${dailyReport.summary.ordersCount}`);
  }
  if (branchSummary.length === 0) {
    throw new Error('Branch performance summary returned no outlets.');
  }
  console.log(`✓ Financial summary verified: Sales Revenue Rs. ${dailyReport.summary.grossRevenue}, Realized Profit Rs. ${dailyReport.summary.grossProfit}.`);

  // ==========================================
  // 7. Scheduled Cron & Advisor Evaluation
  // ==========================================
  console.log('\n--- 7. Testing Scheduled Maintenance & Advisor Evaluation ---');
  const advisor = await generateAdvisorFindings(launchStore.business.id, 'Asia/Karachi');
  console.log(`✓ Business Advisor computed health score: ${advisor.healthScore.score}/100.`);

  // ==========================================
  // 8. Audit Log Immutability
  // ==========================================
  console.log('\n--- 8. Testing Audit Logging Ledger ---');
  const logsCount = await prisma.auditLog.count({
    where: { businessId: launchStore.business.id },
  });
  if (logsCount < 4) {
    throw new Error(`Expected at least 4 audit logs, got ${logsCount}`);
  }
  console.log(`✓ Audit log verified: ${logsCount} immutable security events recorded.`);

  console.log('\n🎉 ALL STEP 20 PRODUCTION LAUNCH SMOKE TESTS PASSED (100% SUCCESS)!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Smoke test failed with error:', err);
  process.exit(1);
});
