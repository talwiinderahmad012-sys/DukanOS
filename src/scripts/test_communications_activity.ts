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
  console.log('--- STARTING STEP 12: COMMUNICATIONS, ACTIVITY & REMOTE MONITORING TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { 
    MembershipRole, 
    AnnouncementPriority, 
    AnnouncementTargetRole,
    AttendanceStatus
  } = await import('../generated/prisma/client');
  const {
    getOrCreateDirectConversation,
    listUserConversations,
    getConversationMessages,
    sendMessage,
    markConversationRead,
    getUnreadMessagesCount,
  } = await import('../services/communications');
  const {
    createAnnouncement,
    listAnnouncements,
    markAnnouncementRead,
    archiveAnnouncement,
  } = await import('../services/announcements');
  const { getBusinessActivityFeed } = await import('../services/activity');
  const {
    getRemoteBusinessStatus,
    updateBusinessOpenStatus,
  } = await import('../services/monitoring');
  const { recordAuditLog } = await import('../services/audit');

  const timestamp = Date.now();
  const emailOwnerA = `owner-a-${timestamp}@example.com`;
  const emailCashierA = `cashier-a-${timestamp}@example.com`;
  const emailOwnerB = `owner-b-${timestamp}@example.com`;

  // 1. Setup Test Businesses and Memberships
  const userOwnerA = await prisma.user.create({
    data: { name: 'Owner Tariq', email: emailOwnerA },
  });

  const userCashierA = await prisma.user.create({
    data: { name: 'Cashier Bilal', email: emailCashierA },
  });

  const userOwnerB = await prisma.user.create({
    data: { name: 'Owner Babar', email: emailOwnerB },
  });

  const bizA = await prisma.business.create({
    data: {
      name: `Dukaan A ${timestamp}`,
      isOpen: true,
      operatingHours: '09:00 AM - 10:00 PM',
      memberships: {
        create: [
          { userId: userOwnerA.id, role: MembershipRole.OWNER },
          { userId: userCashierA.id, role: MembershipRole.CASHIER },
        ],
      },
    },
  });

  const bizB = await prisma.business.create({
    data: {
      name: `Dukaan B ${timestamp}`,
      isOpen: true,
      memberships: {
        create: [
          { userId: userOwnerB.id, role: MembershipRole.OWNER },
        ],
      },
    },
  });

  console.log('✓ Initialized test businesses, users, and memberships.');

  // --- TEST 1: Direct Conversation Creation & Reuse ---
  console.log('\n--- Running Test 1: Direct Conversation Creation & Reuse ---');
  const conv1 = await getOrCreateDirectConversation(bizA.id, userOwnerA.id, userCashierA.id);
  if (!conv1 || conv1.businessId !== bizA.id) {
    throw new Error('Failed to create direct conversation in Business A');
  }

  // Reuse existing conversation
  const conv2 = await getOrCreateDirectConversation(bizA.id, userOwnerA.id, userCashierA.id);
  if (conv1.id !== conv2.id) {
    throw new Error('Conversation was duplicated instead of reused');
  }
  console.log('✓ Test 1 Passed: Direct conversation created and idempotent reuse verified.');

  // --- TEST 2: Messaging, Timestamp Updates & Unread Counts ---
  console.log('\n--- Running Test 2: Message Dispatch & Unread Tracking ---');
  const msg1 = await sendMessage(
    bizA.id,
    userOwnerA.id,
    conv1.id,
    'Please inspect the front counter stock levels.'
  );

  if (!msg1 || msg1.content !== 'Please inspect the front counter stock levels.') {
    throw new Error('Message sending failed');
  }

  const cashierUnread = await getUnreadMessagesCount(bizA.id, userCashierA.id);
  const ownerUnread = await getUnreadMessagesCount(bizA.id, userOwnerA.id);

  if (cashierUnread !== 1) {
    throw new Error(`Expected Cashier unread count to be 1, got ${cashierUnread}`);
  }
  if (ownerUnread !== 0) {
    throw new Error(`Expected Owner unread count to be 0 for own sent message, got ${ownerUnread}`);
  }

  // Cashier marks conversation as read
  await markConversationRead(bizA.id, userCashierA.id, conv1.id);
  const cashierUnreadAfter = await getUnreadMessagesCount(bizA.id, userCashierA.id);
  if (cashierUnreadAfter !== 0) {
    throw new Error(`Expected Cashier unread count to be 0 after marking read, got ${cashierUnreadAfter}`);
  }
  console.log('✓ Test 2 Passed: Messaging, notifications, and unread counts validated.');

  // --- TEST 3: Cross-Tenant Communication Security & Access Denial ---
  console.log('\n--- Running Test 3: Cross-Tenant Isolation & Access Control ---');
  let crossTenantFailed = false;
  try {
    // Owner B (Business B) tries to message Cashier A (Business A)
    await getOrCreateDirectConversation(bizB.id, userOwnerB.id, userCashierA.id);
  } catch (e: any) {
    crossTenantFailed = true;
  }
  if (!crossTenantFailed) {
    throw new Error('Security vulnerability: Cross-tenant conversation was permitted!');
  }

  let unauthorizedReadFailed = false;
  try {
    // Owner B tries to read Business A's conversation
    await getConversationMessages(bizA.id, userOwnerB.id, conv1.id);
  } catch (e: any) {
    unauthorizedReadFailed = true;
  }
  if (!unauthorizedReadFailed) {
    throw new Error('Security vulnerability: Unauthorized user was able to read conversation messages!');
  }
  console.log('✓ Test 3 Passed: Cross-tenant conversations and unauthorized message access strictly blocked.');

  // --- TEST 4: Announcements, Role-Targeting & Read Receipts ---
  console.log('\n--- Running Test 4: Store Announcements & Read Receipts ---');
  const annAll = await createAnnouncement(bizA.id, userOwnerA.id, {
    title: 'Store Cleaning Schedule',
    message: 'All staff must complete area cleaning by 9:30 PM.',
    priority: AnnouncementPriority.URGENT,
    targetRole: AnnouncementTargetRole.ALL,
  });

  const annCashier = await createAnnouncement(bizA.id, userOwnerA.id, {
    title: 'Cash Drawer Protocol',
    message: 'Reconcile drawer before handoff.',
    priority: AnnouncementPriority.NORMAL,
    targetRole: AnnouncementTargetRole.CASHIER,
  });

  // Cashier lists announcements
  const cashierAnnouncements = await listAnnouncements(bizA.id, userCashierA.id, MembershipRole.CASHIER);
  if (cashierAnnouncements.length !== 2) {
    throw new Error(`Expected Cashier to see 2 announcements, got ${cashierAnnouncements.length}`);
  }

  // Cashier acknowledges urgent announcement
  await markAnnouncementRead(bizA.id, userCashierA.id, annAll.id);
  const updatedList = await listAnnouncements(bizA.id, userCashierA.id, MembershipRole.CASHIER);
  const readAnn = updatedList.find((a) => a.id === annAll.id);
  if (!readAnn?.isRead) {
    throw new Error('Announcement read receipt not recorded');
  }
  console.log('✓ Test 4 Passed: Announcements broadcast, role targeting, and read acknowledgment verified.');

  // --- TEST 5: Activity Feed & Role-Based Privacy ---
  console.log('\n--- Running Test 5: Activity Feed & Role Privacy Filters ---');
  await recordAuditLog({
    businessId: bizA.id,
    userId: userOwnerA.id,
    action: 'SALE_CREATED',
    entityType: 'Sale',
    entityId: `sale-1-${timestamp}`,
    metadata: { invoiceNumber: 'INV-101', total: 4500 },
  });

  await recordAuditLog({
    businessId: bizA.id,
    userId: userOwnerA.id,
    action: 'SALARY_PAID',
    entityType: 'EmployeeSalary',
    entityId: `sal-1-${timestamp}`,
    metadata: { period: '2026-08', netSalary: 65000 },
  });

  const ownerFeed = await getBusinessActivityFeed(bizA.id, MembershipRole.OWNER);
  const cashierFeed = await getBusinessActivityFeed(bizA.id, MembershipRole.CASHIER);

  const ownerHasSalary = ownerFeed.some((e) => e.type === 'SALARY_PAID');
  const cashierHasSalary = cashierFeed.some((e) => e.type === 'SALARY_PAID');

  if (!ownerHasSalary) {
    throw new Error('Owner should see salary audit events');
  }
  if (cashierHasSalary) {
    throw new Error('Privacy breach: Cashier was able to see salary audit records!');
  }
  console.log('✓ Test 5 Passed: Activity feed streams operational events and protects sensitive payroll/complaint data.');

  // --- TEST 6: Remote Monitoring & Live Operational Cockpit ---
  console.log('\n--- Running Test 6: Remote Monitoring & Live Cockpit ---');
  const empA = await prisma.employee.create({
    data: {
      businessId: bizA.id,
      employeeCode: `EMP-${timestamp}`,
      name: 'Bilal Cashier',
      position: 'Cashier',
      basicSalary: 30000,
    },
  });

  await prisma.employeeAttendance.create({
    data: {
      businessId: bizA.id,
      employeeId: empA.id,
      date: new Date(),
      status: AttendanceStatus.PRESENT,
    },
  });

  const monitoringStatus = await getRemoteBusinessStatus(bizA.id);
  if (!monitoringStatus.business.isOpen) {
    throw new Error('Expected business to be open');
  }
  if (monitoringStatus.attendance.presentCount !== 1) {
    throw new Error(`Expected 1 employee present, got ${monitoringStatus.attendance.presentCount}`);
  }

  // Toggle store status to closed
  const updatedBiz = await updateBusinessOpenStatus(bizA.id, userOwnerA.id, false, '10:00 AM - 09:00 PM');
  if (updatedBiz.isOpen !== false) {
    throw new Error('Failed to update business open/closed status');
  }
  console.log('✓ Test 6 Passed: Remote business status, live attendance tracking, and store open/closed controls validated.');

  // --- TEST 7: Owner Action Center Issue Aggregation ---
  console.log('\n--- Running Test 7: Owner Action Center Aggregation ---');
  // Create low stock product
  await prisma.product.create({
    data: {
      businessId: bizA.id,
      name: 'Milk Pack 1L',
      sku: `MILK-${timestamp}`,
      purchasePrice: 200,
      sellingPrice: 250,
      currentStock: 2,
      minStockThreshold: 10, // Stock is below threshold
    },
  });

  // Create pending leave
  await prisma.employeeLeave.create({
    data: {
      businessId: bizA.id,
      employeeId: empA.id,
      startDate: new Date(),
      endDate: new Date(),
      reason: 'Doctor appointment',
      status: 'PENDING',
    },
  });

  const updatedStatus = await getRemoteBusinessStatus(bizA.id);
  if (updatedStatus.actionCenter.lowStockCount < 1) {
    throw new Error('Action Center failed to count low stock products');
  }
  if (updatedStatus.actionCenter.pendingLeavesCount < 1) {
    throw new Error('Action Center failed to count pending leaves');
  }
  console.log('✓ Test 7 Passed: Owner Action Center surfaced operational bottlenecks and pending tasks.');

  console.log('\n🎉 ALL STEP 12 COMMUNICATIONS, ACTIVITY & REMOTE MONITORING TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
