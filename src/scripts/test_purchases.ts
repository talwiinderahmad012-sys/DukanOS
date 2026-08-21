export {};

// Load environment variables for standalone script
require('dotenv').config();

// Stub 'server-only' for standalone node execution
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'server-only') {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

async function runTests() {
  const { prisma } = await import('../lib/db/prisma');
  const { createPurchase, cancelPurchase } = await import('../services/purchases');
  const { adjustStock } = await import('../services/inventory');

  console.log('--- Starting Step 7 Purchases & Inventory Tests ---');

  // 1. Setup Test Business, User, Supplier, and Products
  const testUser = await prisma.user.create({
    data: {
      email: `test_purchaser_${Date.now()}@example.com`,
      name: 'Purchaser Admin',
    },
  });

  const testBusiness = await prisma.business.create({
    data: {
      name: 'Test Procurement Store',
      type: 'RETAIL',
    },
  });

  await prisma.businessMembership.create({
    data: {
      userId: testUser.id,
      businessId: testBusiness.id,
      role: 'OWNER',
    },
  });

  const testSupplier = await prisma.supplier.create({
    data: {
      businessId: testBusiness.id,
      name: 'Wholesale Depot Inc.',
      phone: '0300-1234567',
    },
  });

  const productA = await prisma.product.create({
    data: {
      businessId: testBusiness.id,
      name: 'Item Alpha',
      sku: `SKU-ALPHA-${Date.now()}`,
      purchasePrice: 100,
      sellingPrice: 150,
      currentStock: 0,
    },
  });

  const productB = await prisma.product.create({
    data: {
      businessId: testBusiness.id,
      name: 'Item Beta',
      sku: `SKU-BETA-${Date.now()}`,
      purchasePrice: 200,
      sellingPrice: 300,
      currentStock: 0,
    },
  });

  console.log('✓ Test environment fixtures initialized.');

  // 2. Test Purchase Creation & Stock Increment
  const purchase1 = await createPurchase({
    businessId: testBusiness.id,
    userId: testUser.id,
    supplierId: testSupplier.id,
    invoiceNumber: 'INV-TEST-001',
    items: [
      { productId: productA.id, quantity: 20, purchasePrice: 110, discount: 0 },
      { productId: productB.id, quantity: 10, purchasePrice: 220, discount: 0 },
    ],
    discount: 100,
    paidAmount: 3000,
  });

  if (!purchase1 || purchase1.items.length !== 2) {
    throw new Error('Purchase 1 creation failed.');
  }

  // Check product stock & purchasePrice updates
  const updatedA1 = await prisma.product.findUnique({ where: { id: productA.id } });
  const updatedB1 = await prisma.product.findUnique({ where: { id: productB.id } });

  if (updatedA1!.currentStock !== 20 || Number(updatedA1!.purchasePrice) !== 110) {
    throw new Error(`Product A stock/cost mismatch: expected 20/110, got ${updatedA1!.currentStock}/${updatedA1!.purchasePrice}`);
  }
  if (updatedB1!.currentStock !== 10 || Number(updatedB1!.purchasePrice) !== 220) {
    throw new Error(`Product B stock/cost mismatch: expected 10/220, got ${updatedB1!.currentStock}/${updatedB1!.purchasePrice}`);
  }

  // Check Stock Movements
  const movements = await prisma.stockMovement.findMany({
    where: { referenceId: purchase1.id },
  });
  if (movements.length !== 2) {
    throw new Error(`Expected 2 stock movements, found ${movements.length}`);
  }
  console.log('✓ Purchase creation, stock increment, and StockMovement ledger verified.');

  // 3. Test Mandatory Requirement 2: Subsequent Purchase Cost Updates and Rollback
  // Create Purchase 2 for Product A at cost 130
  const purchase2 = await createPurchase({
    businessId: testBusiness.id,
    userId: testUser.id,
    supplierId: testSupplier.id,
    invoiceNumber: 'INV-TEST-002',
    items: [
      { productId: productA.id, quantity: 10, purchasePrice: 130, discount: 0 },
    ],
    discount: 0,
    paidAmount: 1300,
  });

  const updatedA2 = await prisma.product.findUnique({ where: { id: productA.id } });
  if (updatedA2!.currentStock !== 30 || Number(updatedA2!.purchasePrice) !== 130) {
    throw new Error(`Product A stock/cost mismatch after Purchase 2: expected 30/130, got ${updatedA2!.currentStock}/${updatedA2!.purchasePrice}`);
  }

  // Cancel Purchase 2: Cost price should roll back to Purchase 1 cost (110)
  await cancelPurchase(testBusiness.id, testUser.id, purchase2.id, 'Cancelled duplicate shipment');

  const updatedAAfterCancel = await prisma.product.findUnique({ where: { id: productA.id } });
  if (updatedAAfterCancel!.currentStock !== 20 || Number(updatedAAfterCancel!.purchasePrice) !== 110) {
    throw new Error(
      `Product A cost did not rollback to Purchase 1 cost (110). Got stock: ${updatedAAfterCancel!.currentStock}, cost: ${updatedAAfterCancel!.purchasePrice}`
    );
  }
  console.log('✓ Cost-price rollback on purchase cancellation verified (restored to prior valid purchase).');

  // 4. Test Mandatory Requirement 1: Consumed Stock Cancellation Rejection
  // Currently Product A has 20 units (from Purchase 1).
  // Simulate consumption of stock: reduce stock to 5 units (e.g. 15 were sold/consumed).
  await adjustStock(testBusiness.id, testUser.id, productA.id, 5, 'Damaged stock consumed');

  let blockedErrorThrown = false;
  try {
    // Attempt to cancel Purchase 1 (which requires returning 20 units of Product A, but only 5 remain)
    await cancelPurchase(testBusiness.id, testUser.id, purchase1.id, 'Attempting cancel after stock consumed');
  } catch (err: any) {
    if (
      err.message ===
      'Purchase cannot be cancelled because its stock has already been consumed. Review the related inventory/sales transactions first.'
    ) {
      blockedErrorThrown = true;
    } else {
      throw new Error(`Unexpected error message: ${err.message}`);
    }
  }

  if (!blockedErrorThrown) {
    throw new Error('Expected cancellation to be blocked due to consumed stock, but it succeeded.');
  }

  // Verify Purchase 1 is STILL RECEIVED and stock is untouched at 5
  const purchase1Check = await prisma.purchase.findUnique({ where: { id: purchase1.id } });
  const productACheck = await prisma.product.findUnique({ where: { id: productA.id } });

  if (purchase1Check!.status !== 'RECEIVED' || productACheck!.currentStock !== 5) {
    throw new Error('Database state mutated despite blocked cancellation.');
  }
  console.log('✓ Consumed stock cancellation protection verified (atomic block & exact domain error).');

  // 5. Test Cross-Business Tenant Isolation
  const otherBusiness = await prisma.business.create({
    data: { name: 'Other Business Store' },
  });
  const otherProduct = await prisma.product.create({
    data: {
      businessId: otherBusiness.id,
      name: 'Foreign Item',
      purchasePrice: 50,
      sellingPrice: 100,
    },
  });

  let crossTenantBlocked = false;
  try {
    await createPurchase({
      businessId: testBusiness.id,
      userId: testUser.id,
      items: [{ productId: otherProduct.id, quantity: 5, purchasePrice: 50 }],
    });
  } catch (err) {
    crossTenantBlocked = true;
  }

  if (!crossTenantBlocked) {
    throw new Error('Cross-business purchase creation was NOT blocked!');
  }
  console.log('✓ Cross-business tenant isolation verified.');

  console.log('\n========================================');
  console.log('🎉 ALL STEP 7 TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const { prisma } = await import('../lib/db/prisma');
      await prisma.$disconnect();
    } catch {}
  });
