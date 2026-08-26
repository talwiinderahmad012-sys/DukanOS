export {};

// Load environment variables for standalone script
require('dotenv').config();
const fs = require('fs');
const path = require('path');

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
  console.log('--- STARTING STEP 13: PWA, OFFLINE & SYNCHRONIZATION TESTS ---');

  // --- TEST 1: PWA Manifest, Icons & Service Worker File Integrity ---
  console.log('\n--- Running Test 1: PWA Manifest, Icons & Service Worker ---');
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const icon192Path = path.join(process.cwd(), 'public', 'icons', 'icon-192.svg');
  const icon512Path = path.join(process.cwd(), 'public', 'icons', 'icon-512.svg');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('public/manifest.json does not exist');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.display !== 'standalone' || !manifest.icons || manifest.icons.length < 2) {
    throw new Error('public/manifest.json missing required PWA fields');
  }

  if (!fs.existsSync(swPath)) {
    throw new Error('public/sw.js does not exist');
  }
  const swContent = fs.readFileSync(swPath, 'utf8');
  if (!swContent.includes('dukaanos-pwa-v1') || !swContent.includes('/api/')) {
    throw new Error('public/sw.js missing safety or caching rules');
  }

  if (!fs.existsSync(icon192Path) || !fs.existsSync(icon512Path)) {
    throw new Error('PWA SVG icons missing in public/icons/');
  }
  console.log('✓ Test 1 Passed: PWA Manifest, Service Worker, and App Icons verified.');

  // --- TEST 2: Idempotent Sale Processing & Duplicate Prevention ---
  console.log('\n--- Running Test 2: Idempotent Sale Processing & Duplicate Prevention ---');
  const { prisma } = await import('../lib/db/prisma');
  const { MembershipRole } = await import('../generated/prisma/client');
  const { createSale } = await import('../services/sales');

  const timestamp = Date.now();
  const emailOwner = `owner-pwa-${timestamp}@example.com`;

  const userOwner = await prisma.user.create({
    data: { name: 'PWA Owner', email: emailOwner },
  });

  const biz = await prisma.business.create({
    data: {
      name: `PWA Store ${timestamp}`,
      isOpen: true,
      memberships: {
        create: [{ userId: userOwner.id, role: MembershipRole.OWNER }],
      },
    },
  });

  const product = await prisma.product.create({
    data: {
      businessId: biz.id,
      name: 'PWA Rice 5kg',
      sku: `RICE-${timestamp}`,
      purchasePrice: 800,
      sellingPrice: 1000,
      currentStock: 10,
      minStockThreshold: 2,
    },
  });

  const clientTxId = `offline-tx-uuid-${timestamp}`;

  // First execution: Simulates offline sale syncing
  const sale1 = await createSale({
    businessId: biz.id,
    userId: userOwner.id,
    items: [{ productId: product.id, quantity: 2, sellingPrice: 1000 }],
    paidAmount: 2000,
    clientTransactionId: clientTxId,
  });

  // Verify stock decremented to 8
  const pAfterSale1 = await prisma.product.findUnique({ where: { id: product.id } });
  if (pAfterSale1?.currentStock !== 8) {
    throw new Error(`Expected product stock to be 8, got ${pAfterSale1?.currentStock}`);
  }

  // Second execution: Simulates client retry of the SAME offline transaction
  const sale2 = await createSale({
    businessId: biz.id,
    userId: userOwner.id,
    items: [{ productId: product.id, quantity: 2, sellingPrice: 1000 }],
    paidAmount: 2000,
    clientTransactionId: clientTxId,
  });

  // Idempotency assertions
  if (sale1.id !== sale2.id || sale1.invoiceNumber !== sale2.invoiceNumber) {
    throw new Error('Idempotency failure: Duplicate sale created for the same clientTransactionId!');
  }

  // Verify stock was NOT decremented a second time (must remain 8)
  const pAfterSale2 = await prisma.product.findUnique({ where: { id: product.id } });
  if (pAfterSale2?.currentStock !== 8) {
    throw new Error(`Idempotency failure: Stock double decremented to ${pAfterSale2?.currentStock}`);
  }

  const totalSalesCount = await prisma.sale.count({
    where: { businessId: biz.id, clientTransactionId: clientTxId },
  });
  if (totalSalesCount !== 1) {
    throw new Error(`Expected strictly 1 sale record, found ${totalSalesCount}`);
  }
  console.log('✓ Test 2 Passed: Offline transaction retry returned identical sale without duplicate stock deductions.');

  // --- TEST 3: Stale Offline Sale Conflict Detection ---
  console.log('\n--- Running Test 3: Stale Offline Stock Conflict Detection ---');
  // Current stock is 8.
  // Cashier online sells 7 units:
  await createSale({
    businessId: biz.id,
    userId: userOwner.id,
    items: [{ productId: product.id, quantity: 7, sellingPrice: 1000 }],
    paidAmount: 7000,
  });

  const pAfterOnlineSale = await prisma.product.findUnique({ where: { id: product.id } });
  if (pAfterOnlineSale?.currentStock !== 1) {
    throw new Error(`Expected stock to be 1, got ${pAfterOnlineSale?.currentStock}`);
  }

  // Now offline device attempts to sync a sale of 5 units (recorded when stock appeared to be 8)
  let conflictOccurred = false;
  try {
    await createSale({
      businessId: biz.id,
      userId: userOwner.id,
      items: [{ productId: product.id, quantity: 5, sellingPrice: 1000 }],
      paidAmount: 5000,
      clientTransactionId: `offline-conflict-${timestamp}`,
    });
  } catch (err: any) {
    if (err.code === 'INSUFFICIENT_STOCK' || err.message === 'INSUFFICIENT_STOCK' || err.message?.includes('Insufficient stock')) {
      conflictOccurred = true;
    }
  }

  if (!conflictOccurred) {
    throw new Error('Conflict failure: Server allowed stale offline sale to oversell inventory!');
  }

  // Verify stock remained safely at 1 and was not corrupted
  const pAfterConflict = await prisma.product.findUnique({ where: { id: product.id } });
  if (pAfterConflict?.currentStock !== 1) {
    throw new Error(`Stock corrupted after conflict: ${pAfterConflict?.currentStock}`);
  }
  // --- TEST 4: Authentication & Sign-In Route Service Worker Bypass ---
  console.log('\n--- Running Test 4: Auth & Sign-In Route Service Worker Bypass ---');
  if (!swContent.includes("url.pathname.startsWith('/login')")) {
    throw new Error('Regression: public/sw.js must explicitly exclude /login from offline fallback interception.');
  }
  if (!swContent.includes("url.pathname.startsWith('/register')")) {
    throw new Error('Regression: public/sw.js must explicitly exclude /register from offline fallback interception.');
  }
  if (!swContent.includes("url.pathname.startsWith('/api/')") || !swContent.includes("url.pathname.includes('/auth/')")) {
    throw new Error('Regression: public/sw.js must bypass dynamic API and NextAuth endpoints.');
  }
  if (!swContent.includes("window.addEventListener('online'")) {
    throw new Error('Regression: public/sw.js offline fallback must include online reconnect auto-reload handler.');
  }
  console.log('✓ Test 4 Passed: Auth entry routes (/login, /register, /api/auth) strictly bypass SW offline interception.');

  console.log('\n🎉 ALL STEP 13 PWA, OFFLINE & SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
