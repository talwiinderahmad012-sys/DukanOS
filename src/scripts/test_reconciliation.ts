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
  console.log('--- STARTING STEP 21: FINANCIAL & INVENTORY RECONCILIATION SUITE ---');

  const { prisma } = await import('../lib/db/prisma');
  const { createBusinessForUser } = await import('../services/business/context');
  const { createProduct } = await import('../services/products');
  const { createSale } = await import('../services/sales');
  const { createCustomer, recordCustomerPayment } = await import('../services/customers');
  const { PaymentMethod, MovementType } = await import('../generated/prisma/client');
  const bcrypt = (await import('bcryptjs')).default;

  // Initialize a fresh business for mathematical reconciliation
  const hashedPassword = await bcrypt.hash('ReconcilePass123!', 10);
  const testUser = await prisma.user.create({
    data: {
      name: 'Reconciliation Auditor',
      email: `auditor.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
    },
  });

  const reconStore = await createBusinessForUser(testUser.id, {
    name: 'Audited Commerce Mart',
    type: 'RETAIL',
    branchName: 'Audit Branch 1',
    branchCode: 'AUD-01',
  });

  const businessId = reconStore.business.id;
  const branchId = reconStore.branch.id;

  // ==========================================
  // Test 1: Stock Movement Ledger vs Product.currentStock
  // ==========================================
  console.log('\n--- 1. Reconciling Stock Movement Ledger vs Product.currentStock ---');
  const p1 = await createProduct(businessId, testUser.id, {
    name: 'Audit Cooking Oil 1L',
    sku: `AUD-OIL-${Date.now()}`,
    purchasePrice: 400,
    sellingPrice: 500,
  });

  // Add opening stock of 100
  await prisma.stockMovement.create({
    data: {
      businessId,
      branchId,
      productId: p1.id,
      movementType: MovementType.OPENING,
      quantity: 100,
      previousStock: 0,
      resultingStock: 100,
      createdBy: testUser.id,
    },
  });
  await prisma.product.update({ where: { id: p1.id }, data: { currentStock: 100 } });

  // Sale of 25 units
  await createSale({
    businessId,
    branchId,
    userId: testUser.id,
    paymentMethod: PaymentMethod.CASH,
    paidAmount: 12500,
    items: [{ productId: p1.id, quantity: 25, sellingPrice: 500 }],
  });

  // Calculate movements from ledger (signed quantities)
  const movements = await prisma.stockMovement.findMany({
    where: { productId: p1.id },
  });

  const ledgerCalculatedStock = movements.reduce((sum, m) => sum + m.quantity, 0);

  const freshProduct = await prisma.product.findUnique({ where: { id: p1.id } });
  if (freshProduct?.currentStock !== 75 || ledgerCalculatedStock !== 75) {
    throw new Error(`Stock mismatch: Product.currentStock = ${freshProduct?.currentStock}, Ledger = ${ledgerCalculatedStock}`);
  }
  console.log(`✓ Stock Ledger Verified: Opening (100) - Sale (25) = Closing (${freshProduct.currentStock}).`);

  // ==========================================
  // Test 2: Sales Invoices vs Line Totals vs Profit Snapshots
  // ==========================================
  console.log('\n--- 2. Reconciling Sales Invoices vs Line Totals & Profit ---');
  const sales = await prisma.sale.findMany({
    where: { businessId },
    include: { items: true },
  });

  for (const sale of sales) {
    const calculatedTotal = sale.items.reduce((sum, item) => sum + Number(item.lineTotal), 0) - Number(sale.discount || 0);
    if (Math.abs(calculatedTotal - Number(sale.total)) > 0.01) {
      throw new Error(`Sale total mismatch on invoice ${sale.invoiceNumber}: stored ${sale.total}, computed ${calculatedTotal}`);
    }

    for (const item of sale.items) {
      const expectedProfit = (Number(item.sellingPrice) - Number(item.costPrice)) * item.quantity - Number(item.discount || 0);
      if (Math.abs(expectedProfit - Number(item.lineProfit)) > 0.01) {
        throw new Error(`Line profit mismatch on item ${item.id}: stored ${item.lineProfit}, expected ${expectedProfit}`);
      }
    }
  }
  console.log(`✓ Financial Sales Snapshot Verified: All invoice totals and profit margins 100% accurate.`);

  // ==========================================
  // Test 3: Customer Udhaar Ledger Reconciliation
  // ==========================================
  console.log('\n--- 3. Reconciling Customer Udhaar Ledger vs Outstanding Balance ---');
  const cust = await createCustomer(businessId, testUser.id, {
    name: 'Audited Customer',
    phone: '0300-4443322',
  });

  // Credit Sale: total 5000, paid 2000 -> Udhaar 3000
  await createSale({
    businessId,
    branchId,
    customerId: cust.id,
    userId: testUser.id,
    paymentMethod: PaymentMethod.CREDIT,
    paidAmount: 2000,
    items: [{ productId: p1.id, quantity: 10, sellingPrice: 500 }],
  });

  // Customer makes 1000 payment
  await recordCustomerPayment(businessId, testUser.id, cust.id, 1000, PaymentMethod.CASH, 'Partial payment');

  // Customer makes another 500 payment
  await recordCustomerPayment(businessId, testUser.id, cust.id, 500, PaymentMethod.CASH, 'Second payment');

  const reloadedCust = await prisma.customer.findUnique({ where: { id: cust.id } });
  const allCustSales = await prisma.sale.findMany({ where: { customerId: cust.id } });
  const allCustPayments = await prisma.customerPayment.findMany({ where: { customerId: cust.id } });

  const totalCreditGiven = allCustSales.reduce((sum, s) => sum + (Number(s.total) - Number(s.paidAmount)), 0);
  const totalPaymentsMade = allCustPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const expectedBalance = totalCreditGiven - totalPaymentsMade; // 3000 - 1500 = 1500

  if (Number(reloadedCust?.outstanding) !== expectedBalance) {
    throw new Error(`Customer balance mismatch: stored ${reloadedCust?.outstanding}, expected ${expectedBalance}`);
  }
  console.log(`✓ Customer Ledger Verified: Credit Given (3000) - Payments (1500) = Balance (${reloadedCust?.outstanding}).`);

  // ==========================================
  // Test 4: Concurrency Stock Race Condition Test
  // ==========================================
  console.log('\n--- 4. Testing Concurrent Stock Checkout Race Condition ---');
  const raceProduct = await createProduct(businessId, testUser.id, {
    name: 'Limited Edition Ghee 1kg',
    sku: `RACE-GHEE-${Date.now()}`,
    purchasePrice: 500,
    sellingPrice: 600,
  });

  // Set stock to exactly 4 units
  await prisma.product.update({ where: { id: raceProduct.id }, data: { currentStock: 4 } });
  await prisma.stockMovement.create({
    data: {
      businessId,
      branchId,
      productId: raceProduct.id,
      movementType: MovementType.OPENING,
      quantity: 4,
      previousStock: 0,
      resultingStock: 4,
      createdBy: testUser.id,
    },
  });

  // Launch 2 simultaneous sales for 3 units each
  console.log('  → Launching 2 parallel checkout requests (Cashier A requesting 3 units, Cashier B requesting 3 units from total stock of 4)...');
  const results = await Promise.allSettled([
    createSale({
      businessId,
      branchId,
      userId: testUser.id,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 1800,
      items: [{ productId: raceProduct.id, quantity: 3, sellingPrice: 600 }],
    }),
    createSale({
      businessId,
      branchId,
      userId: testUser.id,
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 1800,
      items: [{ productId: raceProduct.id, quantity: 3, sellingPrice: 600 }],
    }),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  if (fulfilled.length !== 1 || rejected.length !== 1) {
    throw new Error(`Concurrency race condition failed: Expected exactly 1 success and 1 rejection, got ${fulfilled.length} successes and ${rejected.length} rejections.`);
  }

  const finalRaceStock = await prisma.product.findUnique({ where: { id: raceProduct.id } });
  if (finalRaceStock?.currentStock !== 1) {
    throw new Error(`Expected remaining stock to be 1, got ${finalRaceStock?.currentStock}`);
  }

  console.log(`✓ Concurrency Race Condition Verified: Atomic row lock successfully protected stock balance (Remaining: ${finalRaceStock.currentStock}, Over-sale prevented).`);

  console.log('\n🎉 ALL RECONCILIATION & CONCURRENCY TESTS PASSED (100% ACCURACY)!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Reconciliation failed:', err);
  process.exit(1);
});
