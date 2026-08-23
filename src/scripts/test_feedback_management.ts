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
  console.log('--- STARTING STEP 29: CUSTOMER FEEDBACK & COMPLAINT MANAGEMENT TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const {
    CommunicationChannel,
    CustomerFeedbackType,
    FeedbackPriority,
    FeedbackWorkflowStatus,
  } = await import('../generated/prisma/client');
  const {
    getFeedbackStats,
    listFeedbackRecords,
    getFeedbackRecord,
    createFeedbackRecord,
    updateFeedbackStatus,
    updateFeedbackPriority,
    updateFeedbackInternalNotes,
    addFeedbackResponse,
    deleteFeedbackRecord,
    getFeedbackTrendAnalysis,
    submitPublicFeedback,
  } = await import('../services/feedback-management');

  const timestamp = Date.now();
  const testEmailA = `test-fb-owner-a-${timestamp}@example.com`;
  const testEmailB = `test-fb-owner-b-${timestamp}@example.com`;
  const testEmailC = `test-fb-cashier-a-${timestamp}@example.com`;

  // 1. Setup: two isolated businesses + a cashier in business A
  const userA = await prisma.user.create({ data: { name: 'Feedback Owner A', email: testEmailA } });
  const bizA = await prisma.business.create({
    data: {
      name: `Feedback Store A ${timestamp}`,
      memberships: { create: { userId: userA.id, role: 'OWNER' } },
    },
  });

  const userB = await prisma.user.create({ data: { name: 'Feedback Owner B', email: testEmailB } });
  const bizB = await prisma.business.create({
    data: {
      name: `Feedback Store B ${timestamp}`,
      memberships: { create: { userId: userB.id, role: 'OWNER' } },
    },
  });

  const userCashierA = await prisma.user.create({
    data: { name: 'Feedback Cashier A', email: testEmailC },
  });
  await prisma.businessMembership.create({
    data: { businessId: bizA.id, userId: userCashierA.id, role: 'CASHIER' },
  });

  const productA = await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Complaint Magnet Widget',
      sku: `CMW-${timestamp}`,
      purchasePrice: 500,
      sellingPrice: 800,
      currentStock: 20,
    },
  });

  const customerA = await prisma.customer.create({
    data: {
      businessId: bizA.id,
      name: 'Ayesha Khan',
      phone: `0300${timestamp.toString().slice(-7)}`,
    },
  });

  const saleA = await prisma.sale.create({
    data: {
      businessId: bizA.id,
      customerId: customerA.id,
      invoiceNumber: `INV-FB-${timestamp}`,
      subtotal: 800,
      total: 800,
      paidAmount: 800,
      status: 'COMPLETED',
      items: {
        create: [
          {
            productId: productA.id,
            quantity: 1,
            sellingPrice: 800,
            costPrice: 500,
            lineTotal: 800,
            lineProfit: 300,
          },
        ],
      },
    },
  });

  console.log('✓ Initialized test businesses (A & B), cashier, product, customer and sale.');
  // --- TEST 1: Creation with tenant-scoped link validation ---
  console.log('\n--- Running Test 1: Creation & Tenant-Scoped Link Validation ---');
  const complaint = await createFeedbackRecord(bizA.id, userA.id, {
    customerId: customerA.id,
    saleId: saleA.id,
    productId: productA.id,
    type: CustomerFeedbackType.COMPLAINT,
    title: 'Broken widget delivered',
    description: 'The widget arrived cracked and the box was damaged.',
    priority: FeedbackPriority.HIGH,
    source: 'MANUAL',
  });

  if (complaint.type !== CustomerFeedbackType.COMPLAINT || complaint.priority !== FeedbackPriority.HIGH) {
    throw new Error(`Complaint created with wrong defaults: ${JSON.stringify({ type: complaint.type, priority: complaint.priority })}`);
  }
  if (complaint.status !== FeedbackWorkflowStatus.PENDING) {
    throw new Error(`Expected new complaints to start PENDING, got ${complaint.status}`);
  }

  // Cross-tenant link must be rejected (biz B tries to link biz A's customer)
  let crossTenantRejected = false;
  try {
    await createFeedbackRecord(bizB.id, userB.id, {
      customerId: customerA.id, // belongs to bizA
      type: CustomerFeedbackType.FEEDBACK,
      title: 'Should fail',
      description: 'Linking another tenant customer must fail.',
      priority: FeedbackPriority.LOW,
      source: 'MANUAL',
    });
  } catch (e: any) {
    crossTenantRejected = true;
    if (!e.message.includes('Customer not found or unauthorized')) {
      throw new Error(`Unexpected cross-tenant error: ${e.message}`);
    }
  }
  if (!crossTenantRejected) {
    throw new Error('SECURITY: Cross-tenant customer link was accepted!');
  }
  console.log('✓ Test 1 Passed: Creation works; cross-tenant entity links are rejected.');

  // --- TEST 2: Tenant isolation on reads ---
  console.log('\n--- Running Test 2: Tenant Isolation on Reads ---');
  const listA = await listFeedbackRecords(bizA.id, 'OWNER');
  const listB = await listFeedbackRecords(bizB.id, 'OWNER');

  if (listA.records.length !== 1 || listA.records[0].id !== complaint.id) {
    throw new Error(`Biz A list mismatch: ${JSON.stringify(listA.records.map((r) => r.id))}`);
  }
  if (listB.records.length !== 0) {
    throw new Error(`SECURITY: Biz B can see Biz A feedback! Count: ${listB.records.length}`);
  }

  let crossReadRejected = false;
  try {
    await getFeedbackRecord(bizB.id, complaint.id, 'OWNER');
  } catch (e: any) {
    crossReadRejected = true;
    if (!e.message.includes('not found or unauthorized')) {
      throw new Error(`Unexpected cross-read error: ${e.message}`);
    }
  }
  if (!crossReadRejected) {
    throw new Error('SECURITY: getFeedbackRecord leaked another tenant record!');
  }
  console.log('✓ Test 2 Passed: Tenant isolation enforced on list & detail reads.');

  // --- TEST 3: Role authorization (cashier restrictions) ---
  console.log('\n--- Running Test 3: Role-Based Authorization ---');

  // 3a. Cashier cannot see internal notes
  await updateFeedbackInternalNotes(bizA.id, userA.id, 'OWNER', complaint.id, 'Refund approved by owner. Supplier at fault.');
  const cashierView = await getFeedbackRecord(bizA.id, complaint.id, 'CASHIER');
  const ownerView = await getFeedbackRecord(bizA.id, complaint.id, 'OWNER');
  if (cashierView.internalNotes !== null) {
    throw new Error('SECURITY: Cashier can view internal notes!');
  }
  if (!ownerView.internalNotes || !ownerView.internalNotes.includes('Refund approved')) {
    throw new Error('Owner lost access to internal notes.');
  }

  const cashierList = await listFeedbackRecords(bizA.id, 'CASHIER');
  const cashierRecord = cashierList.records.find((r) => r.id === complaint.id);
  if (!cashierRecord || cashierRecord.internalNotes !== undefined) {
    throw new Error('SECURITY: Cashier list view exposes internal notes!');
  }

  // 3b. Cashier cannot delete
  let cashierDeleteRejected = false;
  try {
    await deleteFeedbackRecord(bizA.id, userCashierA.id, 'CASHIER', complaint.id);
  } catch (e: any) {
    cashierDeleteRejected = true;
    if (!e.message.includes('Forbidden')) {
      throw new Error(`Unexpected delete error: ${e.message}`);
    }
  }
  if (!cashierDeleteRejected) {
    throw new Error('SECURITY: Cashier was able to delete a complaint!');
  }

  // 3c. Cashier cannot add internal responses
  let cashierInternalRejected = false;
  try {
    await addFeedbackResponse(bizA.id, userCashierA.id, 'CASHIER', complaint.id, 'internal msg', true);
  } catch (e: any) {
    cashierInternalRejected = true;
    if (!e.message.includes('Forbidden')) {
      throw new Error(`Unexpected internal response error: ${e.message}`);
    }
  }
  if (!cashierInternalRejected) {
    throw new Error('SECURITY: Cashier added an internal response!');
  }

  // 3d. Cashier CAN add public responses (frontline service)
  const cashierPublicResponse = await addFeedbackResponse(
    bizA.id,
    userCashierA.id,
    'CASHIER',
    complaint.id,
    'We are sorry! Our team is checking your order.',
    false
  );
  if (cashierPublicResponse.isInternal) {
    throw new Error('Public response flagged as internal.');
  }
  console.log('✓ Test 3 Passed: Cashier blocked from internal notes/delete/internal replies; public replies allowed.');

  // --- TEST 4: Communication Center integration (Step 28 MOCK provider) ---
  console.log('\n--- Running Test 4: Communication Center Integration ---');
  await prisma.communicationProviderConfig.upsert({
    where: {
      businessId_channel: {
        businessId: bizA.id,
        channel: CommunicationChannel.WHATSAPP,
      },
    },
    update: { isEnabled: true, provider: 'MOCK', config: '{}' },
    create: {
      businessId: bizA.id,
      channel: CommunicationChannel.WHATSAPP,
      provider: 'MOCK',
      isEnabled: true,
      config: '{}',
    },
  });

  const ownerReply = await addFeedbackResponse(
    bizA.id,
    userA.id,
    'OWNER',
    complaint.id,
    'We have dispatched a replacement widget, sorry for the trouble!',
    false
  );
  if (ownerReply.isInternal) {
    throw new Error('Owner public reply incorrectly flagged internal.');
  }

  const queuedMsg = await prisma.communicationMessage.findFirst({
    where: {
      businessId: bizA.id,
      customerId: customerA.id,
      messageType: 'FEEDBACK_RESPONSE',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!queuedMsg) {
    throw new Error('Communication Center did not receive the feedback response message.');
  }
  if (queuedMsg.status !== 'SENT' && queuedMsg.status !== 'DELIVERED') {
    throw new Error(`Expected MOCK provider to send message, got status: ${queuedMsg.status}`);
  }
  if (!queuedMsg.body.includes('replacement widget')) {
    throw new Error('Message body does not contain the response text.');
  }
  if (queuedMsg.recipient !== customerA.phone) {
    throw new Error(`Message recipient mismatch: ${queuedMsg.recipient}`);
  }
  console.log(`✓ Test 4 Passed: Mock provider received message (status=${queuedMsg.status}).`);

  // --- TEST 5: Status workflow + audit logs ---
  console.log('\n--- Running Test 5: Status Workflow & Audit Logging ---');
  const resolved = await updateFeedbackStatus(
    bizA.id,
    userA.id,
    complaint.id,
    FeedbackWorkflowStatus.RESOLVED,
    { notifyCustomer: true, channel: CommunicationChannel.WHATSAPP }
  );
  if (resolved.status !== FeedbackWorkflowStatus.RESOLVED) {
    throw new Error(`Status not updated: ${resolved.status}`);
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: { businessId: bizA.id, entityType: 'Feedback', entityId: complaint.id },
    orderBy: { createdAt: 'asc' },
  });
  const auditActions = auditLogs.map((l) => l.action);
  for (const expected of [
    'FEEDBACK_CREATED',
    'FEEDBACK_RESPONSE_ADDED',
    'FEEDBACK_NOTES_UPDATED',
    'FEEDBACK_STATUS_CHANGED',
  ]) {
    if (!auditActions.includes(expected)) {
      throw new Error(`Missing audit log action: ${expected}. Found: ${auditActions.join(', ')}`);
    }
  }

  const statusLog = auditLogs.find((l) => l.action === 'FEEDBACK_STATUS_CHANGED');
  if (statusLog && statusLog.metadata) {
    const meta = JSON.parse(statusLog.metadata);
    if (meta.from !== FeedbackWorkflowStatus.PENDING || meta.to !== FeedbackWorkflowStatus.RESOLVED) {
      throw new Error(`Status audit metadata mismatch: ${statusLog.metadata}`);
    }
  }

  // Resolution notification should have been queued via Communication Center
  const resolutionMsg = await prisma.communicationMessage.findFirst({
    where: {
      businessId: bizA.id,
      customerId: customerA.id,
      messageType: 'FEEDBACK_RESPONSE',
      body: { contains: 'resolved' },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!resolutionMsg) {
    throw new Error('Resolution notification was not queued via Communication Center.');
  }
  console.log('✓ Test 5 Passed: Status transition audit-logged; resolution notification queued.');

  // --- TEST 6: Stats, priority updates & precise average rating ---
  console.log('\n--- Running Test 6: Stats & Priority Updates ---');
  await createFeedbackRecord(bizA.id, userA.id, {
    customerId: customerA.id,
    type: CustomerFeedbackType.REVIEW,
    rating: 5,
    title: 'Great service',
    description: 'Loved the quick replacement.',
    priority: FeedbackPriority.LOW,
    source: 'MANUAL',
  });
  await createFeedbackRecord(bizA.id, userA.id, {
    customerId: customerA.id,
    type: CustomerFeedbackType.REVIEW,
    rating: 4,
    title: 'Good prices',
    description: 'Prices are fair compared to the market.',
    priority: FeedbackPriority.LOW,
    source: 'MANUAL',
  });

  const stats = await getFeedbackStats(bizA.id);
  if (stats.total !== 3) {
    throw new Error(`Expected 3 total records, got ${stats.total}`);
  }
  if (stats.resolved !== 1) {
    throw new Error(`Expected 1 resolved, got ${stats.resolved}`);
  }
  if (stats.averageRating !== 4.5) {
    throw new Error(`Expected precise average rating 4.5, got ${stats.averageRating}`);
  }
  if (stats.highPriorityOpen !== 0) {
    throw new Error(`Expected 0 high priority open (complaint resolved), got ${stats.highPriorityOpen}`);
  }

  const review = await prisma.feedback.findFirst({
    where: { businessId: bizA.id, type: CustomerFeedbackType.REVIEW, rating: 5 },
  });
  if (!review) throw new Error('5-star review not found.');
  const reprioritized = await updateFeedbackPriority(bizA.id, userA.id, review.id, FeedbackPriority.HIGH);
  if (reprioritized.priority !== FeedbackPriority.HIGH) {
    throw new Error('Priority update failed.');
  }
  const statsAfterPriority = await getFeedbackStats(bizA.id);
  if (statsAfterPriority.highPriorityOpen !== 1) {
    throw new Error(`Expected 1 high priority open after reprioritization, got ${statsAfterPriority.highPriorityOpen}`);
  }
  console.log('✓ Test 6 Passed: Stats (integer-derived average), priority updates verified.');

  // --- TEST 7: Filters (status, type, priority, date, search) ---
  console.log('\n--- Running Test 7: List Filters ---');
  const pendingOnly = await listFeedbackRecords(bizA.id, 'OWNER', {
    status: FeedbackWorkflowStatus.PENDING,
  });
  if (pendingOnly.records.length !== 2 || pendingOnly.records.some((r) => r.status !== 'PENDING')) {
    throw new Error(`Pending filter mismatch: ${pendingOnly.records.length}`);
  }

  const reviewsOnly = await listFeedbackRecords(bizA.id, 'OWNER', {
    type: CustomerFeedbackType.REVIEW,
  });
  if (reviewsOnly.records.length !== 2) {
    throw new Error(`Type filter mismatch: ${reviewsOnly.records.length}`);
  }

  const highOnly = await listFeedbackRecords(bizA.id, 'OWNER', {
    priority: FeedbackPriority.HIGH,
  });
  // The original complaint is HIGH (now resolved) + the reprioritized review.
  if (highOnly.records.length !== 2) {
    throw new Error(`Priority filter mismatch: ${highOnly.records.length}`);
  }

  const searched = await listFeedbackRecords(bizA.id, 'OWNER', {
    search: 'cracked',
  });
  if (searched.records.length !== 1 || searched.records[0].id !== complaint.id) {
    throw new Error('Search filter failed to match complaint description.');
  }

  // Date range: today only
  const today = new Date();
  const dateFiltered = await listFeedbackRecords(bizA.id, 'OWNER', {
    from: today.toISOString().slice(0, 10),
  });
  if (dateFiltered.records.length !== 3) {
    throw new Error(`Date filter mismatch: ${dateFiltered.records.length}`);
  }
  console.log('✓ Test 7 Passed: Status, type, priority, search and date filters verified.');

  // --- TEST 8: Customer profile integration ---
  console.log('\n--- Running Test 8: Customer Feedback History ---');
  const customerWithHistory = await prisma.customer.findUnique({
    where: { id: customerA.id },
    include: { feedback: { include: { product: { select: { name: true } } } } },
  });
  if (!customerWithHistory || customerWithHistory.feedback.length !== 3) {
    throw new Error('Customer feedback history (feedback) not linked correctly.');
  }
  if (customerWithHistory.feedback.every((f: any) => f.saleId !== saleA.id && f.productId !== productA.id)) {
    throw new Error('Customer feedback records lost their sale/product links.');
  }
  console.log('✓ Test 8 Passed: Feedback linked to customer, sale and product.');

  // --- TEST 9: Public submission flow ---
  console.log('\n--- Running Test 9: Public Submission ---');
  const publicResult = await submitPublicFeedback(bizA.id, {
    customerName: 'Bilal Ahmed',
    phone: customerA.phone, // existing customer phone → links to existing customer
    type: CustomerFeedbackType.FEEDBACK,
    rating: 4,
    title: 'Nice store',
    description: 'Clean store and polite staff.',
  });
  if (!publicResult.id || publicResult.businessName !== bizA.name) {
    throw new Error('Public submission failed.');
  }

  // Public submission must NOT set internal notes
  const publicRecord = await prisma.feedback.findUnique({ where: { id: publicResult.id } });
  if (!publicRecord || publicRecord.internalNotes !== null) {
    throw new Error('Public submission unexpectedly contains internal notes.');
  }
  if (publicRecord.customerId !== customerA.id) {
    throw new Error('Public submission did not link to the existing customer by phone.');
  }

  // Public submission for an invalid business must fail
  let invalidBizRejected = false;
  try {
    await submitPublicFeedback('non-existent-business-id', {
      type: CustomerFeedbackType.FEEDBACK,
      title: 'x',
      description: 'y',
    });
  } catch (e: any) {
    invalidBizRejected = true;
  }
  if (!invalidBizRejected) {
    throw new Error('SECURITY: Public submission accepted for a non-existent business.');
  }
  console.log('✓ Test 9 Passed: Public submission links by phone; invalid business rejected.');

  // --- TEST 10: Advisor trend analysis + deletion ---
  console.log('\n--- Running Test 10: Advisor Trend & Deletion ---');
  const trend = await getFeedbackTrendAnalysis(bizA.id);
  if (typeof trend.complaintGrowth !== 'number' || typeof trend.surge !== 'boolean') {
    throw new Error(`Trend analysis malformed: ${JSON.stringify(trend)}`);
  }

  // Owner can delete; verify audit log
  const reviewHigh = await prisma.feedback.findFirst({
    where: { businessId: bizA.id, type: CustomerFeedbackType.REVIEW, priority: FeedbackPriority.HIGH },
  });
  await deleteFeedbackRecord(bizA.id, userA.id, 'OWNER', reviewHigh!.id);
  const deleteAudit = await prisma.auditLog.findFirst({
    where: { businessId: bizA.id, entityType: 'Feedback', action: 'FEEDBACK_DELETED', entityId: reviewHigh!.id },
  });
  if (!deleteAudit) {
    throw new Error('Deletion was not audit-logged.');
  }
  const afterDelete = await prisma.feedback.findUnique({ where: { id: reviewHigh!.id } });
  if (afterDelete) {
    throw new Error('Record still exists after deletion.');
  }
  console.log('✓ Test 10 Passed: Advisor trend computed; deletion audit-logged.');

  // --- CLEANUP ---
  console.log('\n--- Cleaning up test data ---');
  // Delete sales first (SaleItem -> Product has a restrictive FK by design).
  await prisma.sale.deleteMany({ where: { businessId: { in: [bizA.id, bizB.id] } } });
  await prisma.business.delete({ where: { id: bizA.id } });
  await prisma.business.delete({ where: { id: bizB.id } });
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });
  await prisma.user.delete({ where: { id: userCashierA.id } });
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL STEP 29 TESTS PASSED ===');
}

runTests().catch((e) => {
  console.error('\n❌ TEST FAILURE:', e);
  process.exit(1);
});