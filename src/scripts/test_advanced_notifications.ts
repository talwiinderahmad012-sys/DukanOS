export {};

// Load environment variables for standalone script
require('dotenv').config();
const fs = require('fs');
const path = require('path');

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
  console.log('--- STARTING STEP 14: ADVANCED NOTIFICATIONS, WEB PUSH & DAILY DIGEST TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { MembershipRole, NotificationSeverity } = await import('../generated/prisma/client');
  const {
    createInAppNotification,
    sendNotification,
    listUserNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    getNotificationPreferences,
    updateNotificationPreferences,
  } = await import('../services/notifications');
  const {
    registerPushSubscription,
    deactivatePushSubscription,
  } = await import('../services/push');
  const { generateDailyBusinessDigest } = await import('../services/digest');

  const timestamp = Date.now();
  const emailOwner = `owner-notif-${timestamp}@example.com`;
  const emailCashier = `cashier-notif-${timestamp}@example.com`;

  // 1. Setup Test Business & Users
  const userOwner = await prisma.user.create({
    data: { name: 'Owner Tariq', email: emailOwner },
  });

  const userCashier = await prisma.user.create({
    data: { name: 'Cashier Bilal', email: emailCashier },
  });

  const biz = await prisma.business.create({
    data: {
      name: `Alerts Supermarket ${timestamp}`,
      isOpen: true,
      timezone: 'Asia/Karachi',
      currency: 'PKR',
      memberships: {
        create: [
          { userId: userOwner.id, role: MembershipRole.OWNER },
          { userId: userCashier.id, role: MembershipRole.CASHIER },
        ],
      },
    },
  });

  console.log('✓ Initialized test business, owner, and cashier.');

  // --- TEST 1: Advanced Notification Creation & Deduplication ---
  console.log('\n--- Running Test 1: Notification Creation & Deduplication ---');
  const deduplicationKey = `LOW_STOCK-${biz.id}-prod99-2026-08`;

  const notif1 = await createInAppNotification({
    businessId: biz.id,
    type: 'LOW_STOCK',
    severity: 'WARNING',
    title: 'Product Low Stock Alert',
    message: 'Milk Pack 1L has reached 2 units remaining.',
    deduplicationKey,
    actionUrl: '/dashboard/inventory',
  });

  if (!notif1 || notif1.deduplicationKey !== deduplicationKey) {
    throw new Error('Failed to create in-app notification');
  }

  // Attempt duplicate generation for the same condition
  const notif2 = await createInAppNotification({
    businessId: biz.id,
    type: 'LOW_STOCK',
    severity: 'WARNING',
    title: 'Product Low Stock Alert (Updated)',
    message: 'Milk Pack 1L has reached 1 unit remaining.',
    deduplicationKey,
    actionUrl: '/dashboard/inventory',
  });

  if (notif1.id !== notif2.id) {
    throw new Error('Deduplication failed: Duplicate notification created for same condition!');
  }

  const countAfterDedup = await prisma.notification.count({
    where: { businessId: biz.id, deduplicationKey },
  });
  if (countAfterDedup !== 1) {
    throw new Error(`Expected exactly 1 notification record, got ${countAfterDedup}`);
  }
  console.log('✓ Test 1 Passed: Notification deduplication verified (prevented alert spam).');

  // --- TEST 2: Role-Based Access & Privacy Restrictions ---
  console.log('\n--- Running Test 2: Role-Based Notification Privacy ---');
  // Create Owner-only notification
  await createInAppNotification({
    businessId: biz.id,
    type: 'PROFIT_DROP',
    severity: 'CRITICAL',
    title: 'Store Gross Margin Alert',
    message: 'Gross margin dropped by 18% this week.',
    isOwnerOnly: true,
    actionUrl: '/dashboard/reports',
  });

  // Owner list
  const ownerFeed = await listUserNotifications(biz.id, userOwner.id, MembershipRole.OWNER);
  const ownerHasFinancial = ownerFeed.notifications.some((n) => n.type === 'PROFIT_DROP');
  if (!ownerHasFinancial) {
    throw new Error('Owner should see financial profit alerts');
  }

  // Cashier list
  const cashierFeed = await listUserNotifications(biz.id, userCashier.id, MembershipRole.CASHIER);
  const cashierHasFinancial = cashierFeed.notifications.some((n) => n.type === 'PROFIT_DROP');
  if (cashierHasFinancial) {
    throw new Error('Privacy failure: Cashier was able to see owner-only financial alerts!');
  }
  console.log('✓ Test 2 Passed: Role-based notification privacy and access controls verified.');

  // --- TEST 3: Web Push Subscription Lifecycle ---
  console.log('\n--- Running Test 3: Web Push Subscription Lifecycle ---');
  const mockEndpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${timestamp}`;
  const mockP256dh = 'BMh7N3K1YyYmQp0...';
  const mockAuth = 't8hK2...';

  const pushSub = await registerPushSubscription(userOwner.id, biz.id, {
    endpoint: mockEndpoint,
    keys: { p256dh: mockP256dh, auth: mockAuth },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    deviceLabel: 'Owner Desktop',
  });

  if (!pushSub.isActive || pushSub.userId !== userOwner.id) {
    throw new Error('Push subscription registration failed');
  }

  // Deactivate subscription
  await deactivatePushSubscription(userOwner.id, mockEndpoint);
  const subAfterDeactivate = await prisma.pushSubscription.findUnique({
    where: { endpoint: mockEndpoint },
  });
  if (subAfterDeactivate?.isActive !== false) {
    throw new Error('Failed to deactivate push subscription');
  }
  console.log('✓ Test 3 Passed: Web Push subscription registration and safe deactivation verified.');

  // --- TEST 4: Owner Daily Business Digest & Idempotency ---
  console.log('\n--- Running Test 4: Owner Daily Business Digest & Idempotency ---');
  // Seed yesterday's sale
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const testProduct = await prisma.product.create({
    data: {
      businessId: biz.id,
      name: 'Cooking Oil 1L',
      sku: `OIL-${timestamp}`,
      purchasePrice: 400,
      sellingPrice: 500,
      currentStock: 3,
      minStockThreshold: 5,
    },
  });

  await prisma.sale.create({
    data: {
      businessId: biz.id,
      invoiceNumber: `INV-YEST-${timestamp}`,
      saleDate: yesterday,
      subtotal: 5000,
      total: 5000,
      paidAmount: 5000,
      status: 'COMPLETED',
      items: {
        create: [
          {
            productId: testProduct.id,
            quantity: 10,
            sellingPrice: 500,
            costPrice: 400,
            lineTotal: 5000,
            lineProfit: 1000,
          },
        ],
      },
    },
  });

  // Run daily digest generator
  const digestRes1 = await generateDailyBusinessDigest(biz.id);
  if (!digestRes1.created || !digestRes1.notification) {
    throw new Error('Failed to generate daily business digest');
  }
  if (!digestRes1.notification.message.includes("Yesterday's Performance")) {
    throw new Error('Daily digest message missing performance metrics');
  }

  // Idempotent second execution for same day
  const digestRes2 = await generateDailyBusinessDigest(biz.id);
  if (digestRes2.created !== false) {
    throw new Error('Digest idempotency failed: Created duplicate digest for same day!');
  }
  console.log('✓ Test 4 Passed: Owner daily digest calculated yesterday metrics and enforced idempotency.');

  // --- TEST 5: Notification Preferences Customization ---
  console.log('\n--- Running Test 5: Notification Preferences & Granular Controls ---');
  // Disable low stock alerts for owner
  await updateNotificationPreferences(userOwner.id, biz.id, {
    lowStockAlerts: false,
  });

  const suppressedNotif = await sendNotification({
    businessId: biz.id,
    recipientId: userOwner.id,
    type: 'LOW_STOCK',
    title: 'Suppressed Alert',
    message: 'Should not create because preference is disabled',
  });

  if (suppressedNotif !== null) {
    throw new Error('Preferences failure: Alert was generated despite user preference being disabled!');
  }
  console.log('✓ Test 5 Passed: User notification preferences respected (suppressed disabled alert types).');

  // --- TEST 6: Service Worker Web Push Handlers ---
  console.log('\n--- Running Test 6: Service Worker Handlers Integrity ---');
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');
  if (!swContent.includes("addEventListener('push'") || !swContent.includes("addEventListener('notificationclick'")) {
    throw new Error('Service Worker missing push or notificationclick event listeners');
  }
  console.log('✓ Test 6 Passed: Service worker push and click navigation handlers verified.');

  console.log('\n🎉 ALL STEP 14 ADVANCED NOTIFICATIONS, WEB PUSH & DAILY DIGEST TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
