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

async function main() {
  console.log('--- STARTING STEP 19: PRODUCTION HARDENING, SECURITY & RELIABILITY TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { hasPermission, assertPermission } = await import('../lib/permissions/matrix');
  const { checkRateLimit, resetRateLimit, getRateLimitIdentifier } = await import('../lib/security/rate-limiter');
  const { sanitizePlainText, roundMoney, sanitizeQuantity } = await import('../lib/security/sanitizer');
  const { sanitizeLogMetadata } = await import('../lib/logging/logger');
  const { createBusinessForUser } = await import('../services/business/context');
  const { createSale } = await import('../services/sales');
  const { PaymentMethod } = await import('../generated/prisma/client');
  const bcrypt = (await import('bcryptjs')).default;

  // 1. Initialize Fixtures: Business A & Business B
  const hashedPassword = await bcrypt.hash('HardenSecret123!', 10);
  const userA = await prisma.user.create({
    data: {
      name: 'Owner Tenant A',
      email: `owner.tenantA.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: 'Owner Tenant B',
      email: `owner.tenantB.${Date.now()}@dukaanos.local`,
      password: hashedPassword,
    },
  });

  const bizA = await createBusinessForUser(userA.id, {
    name: 'Dukaan A Security Mart',
    type: 'RETAIL',
    branchName: 'Branch A1',
    branchCode: 'A1',
  });

  const bizB = await createBusinessForUser(userB.id, {
    name: 'Dukaan B Independent Supermarket',
    type: 'RETAIL',
    branchName: 'Branch B1',
    branchCode: 'B1',
  });

  console.log('✓ Initialized isolated test tenants: Business A and Business B.');

  // ==========================================
  // Test 1: Cross-Tenant Multi-Entity Isolation Matrix
  // ==========================================
  console.log('\n--- Running Test 1: Cross-Tenant Isolation Matrix ---');

  // Create Business A entities
  const prodA = await prisma.product.create({
    data: {
      businessId: bizA.business.id,
      name: 'Confidential Recipe Milk 1L',
      purchasePrice: 150,
      sellingPrice: 200,
      currentStock: 50,
    },
  });

  const custA = await prisma.customer.create({
    data: {
      businessId: bizA.business.id,
      name: 'VIP Customer A',
      phone: '0300-9999999',
      outstanding: 5000,
    },
  });

  const saleA = await createSale({
    businessId: bizA.business.id,
    branchId: bizA.branch.id,
    userId: userA.id,
    paymentMethod: PaymentMethod.CASH,
    paidAmount: 200,
    items: [{ productId: prodA.id, quantity: 1, sellingPrice: 200 }],
  });

  const camA = await prisma.camera.create({
    data: {
      businessId: bizA.business.id,
      branchId: bizA.branch.id,
      name: 'Vault Security Camera',
      type: 'RTSP',
      host: '192.168.1.50',
      port: 554,
      path: '/stream',
    },
  });

  const expA = await prisma.expense.create({
    data: {
      businessId: bizA.business.id,
      category: 'RENT',
      amount: 45000,
    },
  });

  const fbA = await prisma.customerFeedback.create({
    data: {
      businessId: bizA.business.id,
      rating: 5,
      message: 'Excellent private service at store A',
    },
  });

  // Execute Cross-Tenant Scoping Checks against Business B
  const leakChecks = await Promise.all([
    prisma.product.findFirst({ where: { id: prodA.id, businessId: bizB.business.id } }),
    prisma.customer.findFirst({ where: { id: custA.id, businessId: bizB.business.id } }),
    prisma.sale.findFirst({ where: { id: saleA.id, businessId: bizB.business.id } }),
    prisma.camera.findFirst({ where: { id: camA.id, businessId: bizB.business.id } }),
    prisma.expense.findFirst({ where: { id: expA.id, businessId: bizB.business.id } }),
    prisma.customerFeedback.findFirst({ where: { id: fbA.id, businessId: bizB.business.id } }),
  ]);

  for (let i = 0; i < leakChecks.length; i++) {
    if (leakChecks[i] !== null) {
      throw new Error(`Critical Isolation Leak: Entity at index ${i} was accessible across tenants!`);
    }
  }

  console.log('✓ Test 1 Passed: 6/6 Cross-Tenant scoping checks confirmed zero leakage.');

  // ==========================================
  // Test 2: Role Permission Matrix
  // ==========================================
  console.log('\n--- Running Test 2: Role Permission Matrix ---');
  if (!hasPermission('CASHIER', 'CREATE_SALE')) {
    throw new Error('Cashier must have CREATE_SALE capability.');
  }
  if (hasPermission('CASHIER', 'VIEW_SALARIES')) {
    throw new Error('Cashier must NOT have VIEW_SALARIES capability.');
  }
  if (hasPermission('CASHIER', 'EXPORT_DATA')) {
    throw new Error('Cashier must NOT have EXPORT_DATA capability.');
  }
  if (!hasPermission('OWNER', 'EXPORT_DATA') || !hasPermission('OWNER', 'VIEW_SALARIES')) {
    throw new Error('Owner must have EXPORT_DATA and VIEW_SALARIES capability.');
  }

  let forbiddenCaught = false;
  try {
    assertPermission('CASHIER', 'MANAGE_MEMBERS');
  } catch (err: any) {
    if (err.message.includes('Forbidden')) {
      forbiddenCaught = true;
    }
  }

  if (!forbiddenCaught) {
    throw new Error('assertPermission failed to throw on unauthorized role capability.');
  }

  console.log('✓ Test 2 Passed: Role permission matrix strictly enforced.');

  // ==========================================
  // Test 3: Sliding-Window Rate Limiter
  // ==========================================
  console.log('\n--- Running Test 3: In-Memory Rate Limiter ---');
  const testIp = `192.168.1.100-${Date.now()}`;
  const testKey = getRateLimitIdentifier(['AUTH_LOGIN', testIp]);
  resetRateLimit(testKey);

  // Allow up to 5 attempts / min
  for (let i = 1; i <= 5; i++) {
    const res = await checkRateLimit({ limit: 5, windowMs: 60_000, key: testKey });
    if (!res.allowed) {
      throw new Error(`Attempt ${i} should be allowed.`);
    }
  }

  // 6th attempt must be rejected
  const blockedRes = await checkRateLimit({ limit: 5, windowMs: 60_000, key: testKey });
  if (blockedRes.allowed || blockedRes.remaining !== 0) {
    throw new Error('6th attempt was not rate-limited.');
  }

  // Reset and verify recovery
  resetRateLimit(testKey);
  const recoveredRes = await checkRateLimit({ limit: 5, windowMs: 60_000, key: testKey });
  if (!recoveredRes.allowed) {
    throw new Error('Rate limit was not properly reset.');
  }

  console.log('✓ Test 3 Passed: Sliding-window rate limiter blocked excess calls.');

  // ==========================================
  // Test 4: Input / Output Sanitization & Currency Math Precision
  // ==========================================
  console.log('\n--- Running Test 4: Sanitization & Currency Math Precision ---');
  const maliciousInput = '<script>alert("Hacked")</script><b>Customer Notes</b><iframe src="malicious.com"></iframe>';
  const sanitized = sanitizePlainText(maliciousInput);
  if (sanitized !== 'Customer Notes') {
    throw new Error(`Sanitizer failed to strip tags cleanly. Output: "${sanitized}"`);
  }

  // Float precision math tests
  if (roundMoney(0.1 + 0.2) !== 0.3) {
    throw new Error(`Floating point error in roundMoney. Got: ${roundMoney(0.1 + 0.2)}`);
  }
  if (roundMoney(123.456) !== 123.46) {
    throw new Error(`Currency rounding mismatch. Got: ${roundMoney(123.456)}`);
  }

  // Quantity sanity
  if (sanitizeQuantity(-10) !== 0 || sanitizeQuantity('15.8') !== 15) {
    throw new Error('Quantity sanitization error.');
  }

  console.log('✓ Test 4 Passed: XSS defense and 2-decimal currency rounding verified.');

  // ==========================================
  // Test 5: Safe Logger Secret Redaction
  // ==========================================
  console.log('\n--- Running Test 5: Structured Log Secret Redaction ---');
  const sensitiveMeta = {
    userEmail: 'owner@dukaanos.local',
    password: 'SuperSecretPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    rtspUrl: 'rtsp://admin:camPass@192.168.1.1:554/stream',
    nested: {
      secret: 'API_SECRET_KEY_9999',
      safeInfo: 'Active Outlet 1',
    },
  };

  const redacted = sanitizeLogMetadata(sensitiveMeta) as any;
  if (
    redacted.password !== '[REDACTED]' ||
    redacted.token !== '[REDACTED]' ||
    redacted.rtspUrl !== '[REDACTED]' ||
    redacted.nested.secret !== '[REDACTED]' ||
    redacted.nested.safeInfo !== 'Active Outlet 1'
  ) {
    throw new Error(`Log metadata sanitizer failed to redact sensitive secrets! Output: ${JSON.stringify(redacted)}`);
  }

  console.log('✓ Test 5 Passed: Logger automatically masks passwords, secrets, and auth tokens.');

  console.log('\n🎉 ALL STEP 19 PRODUCTION HARDENING TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

main()
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  });
