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
  const { createSale, cancelSale, getSaleById, listSales } = await import('../services/sales');
  const { createCustomer, recordCustomerPayment, getCustomerWithLedger } = await import('../services/customers');
  const { PaymentMethod, MovementType, SaleStatus } = await import('../generated/prisma/client');
  const { AppErrors } = await import('../lib/utils/api-response');

  console.log('\n--- Starting Step 8 Sales, POS & Credit Integration Tests ---');

  // 1. Fixtures Setup
  const timestamp = Date.now();
  const testUser = await prisma.user.create({
    data: {
      email: `cashier_${timestamp}@test.com`,
      password: 'dummyhash',
      name: 'Cashier Tester',
    },
  });

  const testBusiness = await prisma.business.create({
    data: {
      name: `Dukaan POS Store ${timestamp}`,
      currency: 'PKR',
      memberships: {
        create: {
          userId: testUser.id,
          role: 'OWNER',
        },
      },
    },
  });

  const foreignBusiness = await prisma.business.create({
    data: {
      name: `Foreign Store ${timestamp}`,
      currency: 'PKR',
    },
  });

  const foreignProduct = await prisma.product.create({
    data: {
      businessId: foreignBusiness.id,
      name: 'Foreign Biscuit',
      purchasePrice: 50,
      sellingPrice: 70,
      currentStock: 100,
    },
  });

  console.log('✓ Test fixtures and businesses initialized.');

  // ----------------------------------------------------
  // TEST 1: Concurrency-Safe Stock Decrement (Last-Stock Race Condition)
  // ----------------------------------------------------
  console.log('\n[Test 1] Concurrency-Safe Atomic Stock Decrement...');
  const limitedProduct = await prisma.product.create({
    data: {
      businessId: testBusiness.id,
      name: `Limited Drink ${timestamp}`,
      purchasePrice: 100,
      sellingPrice: 150,
      currentStock: 5,
    },
  });

  // Attempt 2 concurrent sales trying to buy 4 units each from a stock of 5
  const sale1Promise = createSale({
    businessId: testBusiness.id,
    userId: testUser.id,
    items: [{ productId: limitedProduct.id, quantity: 4 }],
    paidAmount: 600,
    paymentMethod: PaymentMethod.CASH,
  });

  const sale2Promise = createSale({
    businessId: testBusiness.id,
    userId: testUser.id,
    items: [{ productId: limitedProduct.id, quantity: 4 }],
    paidAmount: 600,
    paymentMethod: PaymentMethod.CASH,
  });

  const results = await Promise.allSettled([sale1Promise, sale2Promise]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  if (fulfilled.length !== 1 || rejected.length !== 1) {
    throw new Error(`Expected exactly 1 sale to succeed and 1 to fail under stock race, got fulfilled=${fulfilled.length}, rejected=${rejected.length}`);
  }

  const rejectedError = (rejected[0] as PromiseRejectedResult).reason as any;
  const isInsufficientStock =
    rejectedError.code === 'INSUFFICIENT_STOCK' ||
    rejectedError.message?.includes('Insufficient stock') ||
    rejectedError.message?.includes(AppErrors.INSUFFICIENT_STOCK);
  if (!isInsufficientStock) {
    throw new Error(`Expected INSUFFICIENT_STOCK error, got: ${rejectedError.message || rejectedError.code}`);
  }

  const updatedLimitedProduct = await prisma.product.findUnique({ where: { id: limitedProduct.id } });
  if (updatedLimitedProduct?.currentStock !== 1) {
    throw new Error(`Expected remaining stock to be exactly 1 (5 - 4), got: ${updatedLimitedProduct?.currentStock}`);
  }
  console.log('✓ Concurrency-safe atomic conditional stock decrement verified: stock never negative.');

  // ----------------------------------------------------
  // TEST 2: Proportional Global Discount Allocation & Realized Profit
  // ----------------------------------------------------
  console.log('\n[Test 2] Proportional Global Discount Allocation & Realized Profit...');
  const prodA = await prisma.product.create({
    data: {
      businessId: testBusiness.id,
      name: `Product A ${timestamp}`,
      purchasePrice: 60,
      sellingPrice: 100,
      currentStock: 50,
    },
  });

  const prodB = await prisma.product.create({
    data: {
      businessId: testBusiness.id,
      name: `Product B ${timestamp}`,
      purchasePrice: 120,
      sellingPrice: 200,
      currentStock: 50,
    },
  });

  // Prod A: 2 pcs * 100 = 200. Cost = 120. Base profit = 80.
  // Prod B: 1 pc * 200 = 200. Cost = 120. Base profit = 80.
  // Subtotal = 400.
  // Global Discount = 40 (split 50/50: 20 to Prod A, 20 to Prod B).
  // Realized revenue: Prod A = 180 (profit 60), Prod B = 180 (profit 60).
  const discountedSale = await createSale({
    businessId: testBusiness.id,
    userId: testUser.id,
    items: [
      { productId: prodA.id, quantity: 2 },
      { productId: prodB.id, quantity: 1 },
    ],
    discount: 40,
    paidAmount: 360,
    paymentMethod: PaymentMethod.CASH,
  });

  const saleItemA = discountedSale.items.find((i) => i.productId === prodA.id);
  const saleItemB = discountedSale.items.find((i) => i.productId === prodB.id);

  if (Number(saleItemA?.lineProfit) !== 60) {
    throw new Error(`Expected Prod A lineProfit to be 60 after proportional discount, got: ${saleItemA?.lineProfit}`);
  }
  if (Number(saleItemB?.lineProfit) !== 60) {
    throw new Error(`Expected Prod B lineProfit to be 60 after proportional discount, got: ${saleItemB?.lineProfit}`);
  }
  console.log('✓ Proportional global discount allocation and immutable realized line profit verified.');

  // ----------------------------------------------------
  // TEST 3: Fully-Paid Customer Sale (No Misleading Credit or Payment Entries)
  // ----------------------------------------------------
  console.log('\n[Test 3] Fully-Paid Customer Sale Semantics...');
  const customer1 = await createCustomer(testBusiness.id, testUser.id, {
    name: 'Aslam VIP',
    phone: '0300-1112233',
  });

  const initialPaymentsCount = await prisma.customerPayment.count({ where: { customerId: customer1.id } });

  const fullyPaidSale = await createSale({
    businessId: testBusiness.id,
    userId: testUser.id,
    customerId: customer1.id,
    items: [{ productId: prodA.id, quantity: 1 }],
    paidAmount: 100,
    paymentMethod: PaymentMethod.CASH,
  });

  const customer1After = await prisma.customer.findUnique({ where: { id: customer1.id } });
  const finalPaymentsCount = await prisma.customerPayment.count({ where: { customerId: customer1.id } });

  if (Number(customer1After?.outstanding) !== 0) {
    throw new Error(`Expected customer outstanding to remain 0, got: ${customer1After?.outstanding}`);
  }
  if (finalPaymentsCount !== initialPaymentsCount) {
    throw new Error('Fully paid upfront sale must NOT create misleading CustomerPayment entries.');
  }
  console.log('✓ Fully-paid customer sale leaves outstanding at 0 without phantom CustomerPayment entries.');

  // ----------------------------------------------------
  // TEST 4: Anonymous Walk-in Cash Sale
  // ----------------------------------------------------
  console.log('\n[Test 4] Anonymous Walk-in Cash Sale...');
  const walkinSale = await createSale({
    businessId: testBusiness.id,
    userId: testUser.id,
    items: [{ productId: prodA.id, quantity: 1 }],
    paidAmount: 100,
    paymentMethod: PaymentMethod.CASH,
  });

  if (walkinSale.customerId !== null) {
    throw new Error('Expected walkin sale customerId to be null.');
  }
  console.log('✓ Anonymous cash sale created cleanly without customer records.');

  // ----------------------------------------------------
  // TEST 5: Credit / Partial Sale & Subsequent Debt Payment Ledger
  // ----------------------------------------------------
  console.log('\n[Test 5] Partial / Credit Sale & Customer Payment Ledger...');
  const creditCustomer = await createCustomer(testBusiness.id, testUser.id, {
    name: 'Bashir Credit',
    phone: '0300-9988776',
  });

  // Prod B = 200 selling price. Quantity 5 = 1000.
  // Paid = 400. Unpaid credit = 600.
  const partialSale = await createSale({
    businessId: testBusiness.id,
    userId: testUser.id,
    customerId: creditCustomer.id,
    items: [{ productId: prodB.id, quantity: 5 }],
    paidAmount: 400,
    paymentMethod: PaymentMethod.CASH,
  });

  const creditCustomerAfterSale = await prisma.customer.findUnique({ where: { id: creditCustomer.id } });
  if (Number(creditCustomerAfterSale?.outstanding) !== 600) {
    throw new Error(`Expected outstanding to be 600, got: ${creditCustomerAfterSale?.outstanding}`);
  }

  // Customer comes back later and pays 350 towards their debt
  const updatedCustomerPayment = await recordCustomerPayment(
    testBusiness.id,
    testUser.id,
    creditCustomer.id,
    350,
    PaymentMethod.CASH,
    'Payment against debt'
  );

  if (Number(updatedCustomerPayment.outstanding) !== 250) {
    throw new Error(`Expected outstanding after payment to be 250 (600 - 350), got: ${updatedCustomerPayment.outstanding}`);
  }

  const ledgerData = await getCustomerWithLedger(testBusiness.id, creditCustomer.id);
  if (!ledgerData || ledgerData.ledger.length !== 2) {
    throw new Error(`Expected 2 ledger entries (Credit Sale + Payment), got: ${ledgerData?.ledger.length}`);
  }
  console.log('✓ Customer credit tracking, debt payments, and running ledger calculation verified.');

  // ----------------------------------------------------
  // TEST 6: Safe Sale Cancellation & No Phantom Refund
  // ----------------------------------------------------
  console.log('\n[Test 6] Safe Sale Cancellation & Credit Reversal...');
  const prodBBeforeCancel = await prisma.product.findUnique({ where: { id: prodB.id } });
  const stockBeforeCancel = prodBBeforeCancel!.currentStock;

  const cancelledSale = await cancelSale(
    testBusiness.id,
    testUser.id,
    partialSale.id,
    'Customer returned all items'
  );

  if (cancelledSale.status !== SaleStatus.CANCELLED) {
    throw new Error(`Expected sale status to be CANCELLED, got: ${cancelledSale.status}`);
  }

  // Verify stock was restored (+5)
  const prodBAfterCancel = await prisma.product.findUnique({ where: { id: prodB.id } });
  if (prodBAfterCancel!.currentStock !== stockBeforeCancel + 5) {
    throw new Error(`Expected stock to be restored by 5, got: ${prodBAfterCancel?.currentStock}`);
  }

  // Verify reverse StockMovement was written
  const returnMovement = await prisma.stockMovement.findFirst({
    where: {
      referenceId: partialSale.id,
      movementType: MovementType.RETURN,
    },
  });
  if (!returnMovement) {
    throw new Error('Expected reverse StockMovement of type RETURN to be created.');
  }

  // Verify customer credit was reversed by 600 (outstanding was 250 -> 250 - 600 = -350)
  const customerAfterCancel = await prisma.customer.findUnique({ where: { id: creditCustomer.id } });
  if (Number(customerAfterCancel?.outstanding) !== -350) {
    throw new Error(`Expected outstanding to be -350 after reversing 600 debt, got: ${customerAfterCancel?.outstanding}`);
  }

  // Verify paid amount on cancelled sale remained unchanged (no fake phantom refund)
  if (Number(cancelledSale.paidAmount) !== 400) {
    throw new Error(`Paid amount must remain 400 on record, got: ${cancelledSale.paidAmount}`);
  }
  console.log('✓ Sale cancellation safely restored stock, reversed credit, wrote audit trail without fake cash refunds.');

  // ----------------------------------------------------
  // TEST 7: Cross-Tenant Security Isolation
  // ----------------------------------------------------
  console.log('\n[Test 7] Cross-Tenant Security Isolation...');
  try {
    await createSale({
      businessId: testBusiness.id,
      userId: testUser.id,
      items: [{ productId: foreignProduct.id, quantity: 1 }],
      paidAmount: 70,
      paymentMethod: PaymentMethod.CASH,
    });
    throw new Error('Cross-tenant product sale should have thrown an error.');
  } catch (err: any) {
    const isExpected =
      err.code === 'NOT_FOUND' ||
      err.code === 'INSUFFICIENT_STOCK' ||
      err.message?.includes('not found') ||
      err.message?.includes('Insufficient stock') ||
      err.message?.includes(AppErrors.INSUFFICIENT_STOCK);
    if (!isExpected) {
      throw err;
    }
  }
  console.log('✓ Cross-tenant product access properly rejected.');

  console.log('\n========================================');
  console.log('🎉 ALL STEP 8 SALES & POS TESTS PASSED!');
  console.log('========================================\n');

  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Integration Test Failure:', err);
  process.exit(1);
});
