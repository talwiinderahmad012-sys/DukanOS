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

async function runTests() {
  console.log('--- STARTING STEP 11: CUSTOMER EXPERIENCE, FEEDBACK & LOYALTY INTEGRATION TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { 
    CustomerStatus,
    FeedbackCategory,
    FeedbackStatus,
    PaymentMethod,
    SaleStatus
  } = await import('../generated/prisma/client');
  const { 
    createCustomer, 
    updateCustomer, 
    archiveCustomer, 
    getCustomersList,
    getCustomerWithLedger 
  } = await import('../services/customers');
  const { getCustomerInsights } = await import('../services/customer-insights');
  const { 
    generateFeedbackInviteToken, 
    verifyFeedbackToken, 
    submitCustomerFeedback, 
    getFeedbackDashboardStats, 
    listBusinessFeedback, 
    resolveFeedback 
  } = await import('../services/feedback');

  const timestamp = Date.now();
  const testEmailA = `test-cust-owner-a-${timestamp}@example.com`;
  const testEmailB = `test-cust-owner-b-${timestamp}@example.com`;

  // 1. Setup Test Businesses and Users
  const userA = await prisma.user.create({
    data: { name: 'Cust Owner A', email: testEmailA },
  });

  const bizA = await prisma.business.create({
    data: {
      name: `Loyalty Store A ${timestamp}`,
      memberships: {
        create: { userId: userA.id, role: 'OWNER' },
      },
    },
  });

  const userB = await prisma.user.create({
    data: { name: 'Cust Owner B', email: testEmailB },
  });

  const bizB = await prisma.business.create({
    data: {
      name: `Loyalty Store B ${timestamp}`,
      memberships: {
        create: { userId: userB.id, role: 'OWNER' },
      },
    },
  });

  const product1 = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Basmati Rice Premium 5kg',
      sku: `RICE-${timestamp}`,
      purchasePrice: 1000,
      sellingPrice: 1300,
      currentStock: 50,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Cooking Oil 5L',
      sku: `OIL-${timestamp}`,
      purchasePrice: 2000,
      sellingPrice: 2400,
      currentStock: 30,
    },
  });

  console.log('✓ Initialized test businesses, products, and users.');

  // --- TEST 1: Customer Creation, Status Updates & Tenant Isolation ---
  console.log('\n--- Running Test 1: Customer Creation, Status Updates & Isolation ---');
  const custA = await createCustomer(bizA.id, userA.id, {
    name: 'Hamza Khan',
    phone: '0301-9988776',
    email: 'hamza@example.com',
    address: 'G-11, Islamabad',
  });

  if (custA.status !== 'ACTIVE') {
    throw new Error(`Expected default customer status ACTIVE, got ${custA.status}`);
  }

  const updatedCust = await updateCustomer(bizA.id, userA.id, custA.id, {
    status: 'INACTIVE',
    notes: 'Temporarily relocated',
  });
  if (updatedCust.status !== 'INACTIVE') {
    throw new Error('Customer status update to INACTIVE failed');
  }

  const listB = await getCustomersList(bizB.id);
  if (listB.customers.length !== 0) {
    throw new Error('Tenant isolation breach! Business B saw Business A customers.');
  }
  console.log('✓ Test 1 Passed: Customer created, status updated, and tenant isolation verified.');

  // --- TEST 2: Factual Customer Insights (AOV, Frequency, Top Products, Cancelled Sales Exclusion) ---
  console.log('\n--- Running Test 2: Customer Insights & Cancelled Sales Exclusion ---');
  // Create 2 completed sales
  const sale1 = await prisma.sale.create({
    data: {
      businessId: bizA.id,
      customerId: custA.id,
      invoiceNumber: `INV-INS-1-${timestamp}`,
      saleDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      subtotal: 5000,
      total: 5000,
      paidAmount: 5000,
      status: 'COMPLETED',
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 2,
            sellingPrice: 1300,
            costPrice: 1000,
            lineTotal: 2600,
            lineProfit: 600,
          },
          {
            productId: product2.id,
            quantity: 1,
            sellingPrice: 2400,
            costPrice: 2000,
            lineTotal: 2400,
            lineProfit: 400,
          },
        ],
      },
    },
  });

  const sale2 = await prisma.sale.create({
    data: {
      businessId: bizA.id,
      customerId: custA.id,
      invoiceNumber: `INV-INS-2-${timestamp}`,
      saleDate: new Date(),
      subtotal: 2600,
      total: 2600,
      paidAmount: 2000, // Rs 600 credit
      status: 'COMPLETED',
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 2,
            sellingPrice: 1300,
            costPrice: 1000,
            lineTotal: 2600,
            lineProfit: 600,
          },
        ],
      },
    },
  });

  // Create 1 CANCELLED sale (must be excluded from active revenue and product sums)
  await prisma.sale.create({
    data: {
      businessId: bizA.id,
      customerId: custA.id,
      invoiceNumber: `INV-INS-CANCEL-${timestamp}`,
      subtotal: 10000,
      total: 10000,
      paidAmount: 10000,
      status: 'CANCELLED',
      items: {
        create: [
          {
            productId: product2.id,
            quantity: 10,
            sellingPrice: 2400,
            costPrice: 2000,
            lineTotal: 10000,
            lineProfit: 2000,
          },
        ],
      },
    },
  });

  const insights = await getCustomerInsights(bizA.id, custA.id);

  if (insights.totalPurchases !== 2) {
    throw new Error(`Expected 2 completed purchases (cancelled sale excluded), got ${insights.totalPurchases}`);
  }
  if (insights.totalSpent !== 7600) {
    throw new Error(`Expected total spent 7600 (5000 + 2600), got ${insights.totalSpent}`);
  }
  if (insights.averageOrderValue !== 3800) {
    throw new Error(`Expected AOV 3800 (7600 / 2), got ${insights.averageOrderValue}`);
  }

  // Top products check: Product1 should have 4 total quantity, Product2 should have 1 quantity (cancelled 10 excluded)
  const topProduct1 = insights.topProducts.find((p) => p.productId === product1.id);
  const topProduct2 = insights.topProducts.find((p) => p.productId === product2.id);

  if (!topProduct1 || topProduct1.totalQuantity !== 4) {
    throw new Error(`Expected top product 1 to have 4 units, got ${topProduct1?.totalQuantity}`);
  }
  if (!topProduct2 || topProduct2.totalQuantity !== 1) {
    throw new Error(`Expected top product 2 to have 1 unit (cancelled excluded), got ${topProduct2?.totalQuantity}`);
  }
  console.log('✓ Test 2 Passed: Customer insights (AOV, purchase frequency, favorite products) calculated with strict cancelled sales exclusion.');

  // --- TEST 3: Secure Feedback Token Generation & Public Verification ---
  console.log('\n--- Running Test 3: Secure Feedback Token Generation & Verification ---');
  const invite = await generateFeedbackInviteToken(bizA.id, {
    customerId: custA.id,
    saleId: sale2.id,
    expiresInDays: 7,
  });

  if (invite.token.length !== 32) {
    throw new Error(`Expected 32-character crypto hex token, got length ${invite.token.length}`);
  }

  const verification = await verifyFeedbackToken(invite.token);
  if (!verification.valid || !verification.business || verification.business.id !== bizA.id) {
    throw new Error('Token verification failed');
  }

  // Ensure verification does not leak private financials
  if ((verification as any).total || (verification as any).outstanding) {
    throw new Error('Security flaw: verification leaked private customer/sale financials!');
  }
  console.log('✓ Test 3 Passed: Secure token generation & safe public verification validated.');

  // --- TEST 4: Customer Feedback Submission & Single-Use Enforcement ---
  console.log('\n--- Running Test 4: Feedback Submission & Single-Use Token Enforcement ---');
  const feedbackResult = await submitCustomerFeedback(invite.token, {
    rating: 5,
    category: FeedbackCategory.SERVICE,
    message: 'Excellent and swift checkout experience at the counter!',
  });

  if (feedbackResult.feedback.rating !== 5 || feedbackResult.feedback.category !== 'SERVICE') {
    throw new Error('Feedback creation mismatch');
  }

  // Attempt second submission with same token (must be rejected)
  let reusedFailed = false;
  try {
    await submitCustomerFeedback(invite.token, {
      rating: 4,
      message: 'Trying to reuse link',
    });
  } catch (e: any) {
    reusedFailed = true;
  }
  if (!reusedFailed) {
    throw new Error('Security failure: Used token was accepted a second time!');
  }
  console.log('✓ Test 4 Passed: Feedback recorded and single-use token invalidated on submission.');

  // --- TEST 5: Low Rating Notification Dispatch ---
  console.log('\n--- Running Test 5: Low Rating Notification Dispatch ---');
  const inviteLow = await generateFeedbackInviteToken(bizA.id, {
    customerId: custA.id,
  });

  const lowFeedback = await submitCustomerFeedback(inviteLow.token, {
    rating: 1,
    category: FeedbackCategory.PRODUCT,
    message: 'Bag of rice had a small tear near the handle.',
  });

  const notifs = await prisma.notification.findMany({
    where: {
      businessId: bizA.id,
      relatedEntityId: lowFeedback.feedback.id,
    },
  });

  if (notifs.length !== 1 || notifs[0].severity !== 'ALERT') {
    throw new Error(`Expected 1 ALERT notification for 1-star rating, got ${notifs.length}`);
  }
  console.log('✓ Test 5 Passed: Low rating alert notification dispatched to store management.');

  // --- TEST 6: Feedback Review, Resolution Note & Dashboard Stats ---
  console.log('\n--- Running Test 6: Feedback Resolution & Dashboard Stats ---');
  const resolved = await resolveFeedback(
    bizA.id,
    userA.id,
    lowFeedback.feedback.id,
    FeedbackStatus.RESOLVED,
    'Called customer, apologized, and issued a replacement bag.'
  );

  if (resolved.status !== 'RESOLVED' || !resolved.resolutionNote) {
    throw new Error('Feedback resolution failed');
  }

  const stats = await getFeedbackDashboardStats(bizA.id);
  if (stats.totalReviews !== 2 || stats.averageRating !== 3.0 || stats.resolvedCount !== 1) {
    throw new Error(`Feedback stats mismatch: ${JSON.stringify(stats)}`);
  }
  console.log('✓ Test 6 Passed: Feedback resolution, manager internal notes, and dashboard stats verified.');

  // --- TEST 7: Anonymous Feedback Support ---
  console.log('\n--- Running Test 7: Anonymous Feedback Support ---');
  const inviteAnon = await generateFeedbackInviteToken(bizA.id);
  const anonFeedback = await submitCustomerFeedback(inviteAnon.token, {
    rating: 4,
    category: FeedbackCategory.PRICE,
    message: 'Great prices overall, will shop again.',
    isAnonymous: true,
  });

  if (anonFeedback.feedback.customerId !== null || !anonFeedback.feedback.isAnonymous) {
    throw new Error('Anonymous feedback attached customer identity improperly');
  }
  console.log('✓ Test 7 Passed: Anonymous feedback cleanly scopes to business without customer linkage.');

  console.log('\n🎉 ALL STEP 11 CUSTOMER EXPERIENCE & FEEDBACK TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
