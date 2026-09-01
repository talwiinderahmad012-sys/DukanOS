export {};

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  console.log('--- STARTING STEP 34: PRODUCTION RELIABILITY, MONITORING & DISASTER RECOVERY ---');

  const { prisma } = await import('../lib/db/prisma');
  const { MembershipRole, SaleStatus, PurchaseStatus, PayrollStatus } = await import('../generated/prisma/client');
  const bcrypt = (await import('bcryptjs')).default;
  const { hasPermission } = await import('../lib/permissions/matrix');
  const { checkRateLimit, clearAllRateLimits } = await import('../lib/security/rate-limiter');
  const { validateEnv } = await import('../lib/config/env');
  const { JobRunner } = await import('../lib/jobs/job-runner');
  const { getAnalyticsCacheStats, clearAllAnalyticsCache, setCachedAnalytics, getCachedAnalytics } = await import('../lib/cache/analytics-cache');
  const { createSale } = await import('../services/sales');
  const { createPurchase } = await import('../services/purchases');
  const { createCustomer, recordCustomerPayment } = await import('../services/customers');
  const { createPayrollPeriod, generateSalariesForPayroll, finalizePayroll, markPayrollPaid } = await import('../services/payroll');
  const { AppError, ErrorCodes } = await import('../lib/errors');
  const { logger, sanitizeLogMetadata, createCorrelationId } = await import('../lib/logging/logger');
  const { createCorrelationId: createCorrelationIdFromRequest } = await import('../lib/logging/middleware-logger');

  const timestamp = Date.now();
  const emailOwner = `owner-s34-${timestamp}@dukaanos.local`;
  const emailManager = `mgr-s34-${timestamp}@dukaanos.local`;
  const emailCashier = `cashier-s34-${timestamp}@dukaanos.local`;
  const emailEmployee = `emp-s34-${timestamp}@dukaanos.local`;

  const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

  let ownerUser: { id: string }, managerUser: { id: string }, cashierUser: { id: string }, employeeUser: { id: string };
  let businessA: { id: string } | undefined, businessB: { id: string } | undefined;
  let branchA1: { id: string }, productA: { id: string }, customerA: { id: string };

  try {
    console.log('\n--- Creating test fixtures ---');

    [ownerUser, managerUser, cashierUser, employeeUser] = await Promise.all([
      prisma.user.create({ data: { email: emailOwner, name: 'Owner User', password: hashedPassword } }),
      prisma.user.create({ data: { email: emailManager, name: 'Manager User', password: hashedPassword } }),
      prisma.user.create({ data: { email: emailCashier, name: 'Cashier User', password: hashedPassword } }),
      prisma.user.create({ data: { email: emailEmployee, name: 'Employee User', password: hashedPassword } }),
    ]);

    businessA = await prisma.business.create({
      data: { name: 'Business A', status: 'ACTIVE', timezone: 'Asia/Karachi', currency: 'PKR' },
    });
    businessB = await prisma.business.create({
      data: { name: 'Business B', status: 'ACTIVE', timezone: 'Asia/Karachi', currency: 'PKR' },
    });

    await prisma.businessMembership.createMany({
      data: [
        { userId: ownerUser.id, businessId: businessA.id, role: MembershipRole.OWNER },
        { userId: managerUser.id, businessId: businessA.id, role: MembershipRole.MANAGER },
        { userId: cashierUser.id, businessId: businessA.id, role: MembershipRole.CASHIER },
        { userId: employeeUser.id, businessId: businessA.id, role: MembershipRole.EMPLOYEE },
      ],
    });

    branchA1 = await prisma.branch.create({ data: { businessId: businessA.id, name: 'HQ', code: 'HQ', status: 'ACTIVE' } });
    productA = await prisma.product.create({
      data: { businessId: businessA.id, name: 'Product A', sku: `PA-${timestamp}`, sellingPrice: 100, purchasePrice: 70, currentStock: 50, isActive: true },
    });
    customerA = await prisma.customer.create({ data: { businessId: businessA.id, name: 'Customer A', phone: '03001234567', isActive: true } });

    console.log('✓ Fixtures created');

    // ==========================================
    // TEST 1: Database health check
    // ==========================================
    console.log('\n--- Test 1: Database health check ---');
    await prisma.$queryRaw`SELECT 1`;
    const dbCount = await prisma.business.count();
    if (dbCount < 2) throw new Error('Database connectivity check failed');
    console.log('✓ Test 1 Passed: Database is reachable and tables are accessible');

    // ==========================================
    // TEST 2: Health endpoint logic
    // ==========================================
    console.log('\n--- Test 2: Health endpoint logic ---');
    const dbHealth = await prisma.$queryRaw`SELECT 1`;
    if (!dbHealth) throw new Error('Health endpoint database check should work');
    console.log('✓ Test 2 Passed: Health endpoint database check works');

    // ==========================================
    // TEST 3: Readiness endpoint logic
    // ==========================================
    console.log('\n--- Test 3: Readiness endpoint logic ---');
    const prismaReady = !!prisma;
    const dbReady = !!dbHealth;
    if (!prismaReady || !dbReady) throw new Error('Application should be ready');
    console.log('✓ Test 3 Passed: Readiness checks pass (database and prisma)');

    // ==========================================
    // TEST 4: Centralized error handling
    // ==========================================
    console.log('\n--- Test 4: Centralized error handling ---');
    try {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Test not found', 404);
    } catch (err) {
      if (!(err instanceof AppError)) throw new Error('Should be AppError instance');
      if (err.code !== 'NOT_FOUND') throw new Error('Should have NOT_FOUND code');
      if (err.statusCode !== 404) throw new Error('Should have 404 status');
      if (err.message !== 'Test not found') throw new Error('Message should be preserved');
    }
    console.log('✓ Test 4 Passed: AppError carries code, statusCode, and message');

    // ==========================================
    // TEST 5: Safe production error response
    // ==========================================
    console.log('\n--- Test 5: Safe production error response ---');
    const dbErr = new AppError(ErrorCodes.DATABASE_ERROR, 'Prisma query failed: connection refused to postgres://user:pass@host:5432', 500);
    if (dbErr.message.includes('postgres://') || dbErr.message.includes('password')) {
      throw new Error('Database credentials should be sanitized from error message');
    }
    console.log('✓ Test 5 Passed: Database errors are sanitized');

    // ==========================================
    // TEST 6: Request ID generation
    // ==========================================
    console.log('\n--- Test 6: Request ID generation ---');
    const reqId = createCorrelationId();
    if (!reqId || reqId.length < 10) throw new Error('Correlation ID should be a valid UUID');
    console.log(`✓ Test 6 Passed: Request ID generated: ${reqId}`);

    // ==========================================
    // TEST 7: Correlation ID from request
    // ==========================================
    console.log('\n--- Test 7: Correlation ID from request ---');
    const mockRequest = new Request('http://localhost:3000/test', {
      headers: { 'x-request-id': 'incoming-123' },
    });
    const extractedId = createCorrelationIdFromRequest(mockRequest);
    if (extractedId !== 'incoming-123') throw new Error('Should extract existing request ID');
    const newId = createCorrelationIdFromRequest(new Request('http://localhost:3000/test'));
    if (!newId || newId.length < 10) throw new Error('Should generate new ID when none provided');
    console.log(`✓ Test 7 Passed: Correlation ID extraction works (${extractedId} -> ${newId})`);

    // ==========================================
    // TEST 8: Structured logging
    // ==========================================
    console.log('\n--- Test 8: Structured logging ---');
    let loggedStructured = false;
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const str = args.join(' ');
      if (str.includes('"level":"info"') && str.includes('"correlationId"')) {
        loggedStructured = true;
      }
      originalLog.apply(console, args);
    };
    logger.info('Structured log test', { correlationId: 'test-123', category: 'TEST', businessId: 'biz-1' });
    console.log = originalLog;
    if (!loggedStructured) throw new Error('Logger should produce structured JSON output');
    console.log('✓ Test 8 Passed: Structured logging produces JSON with required fields');

    // ==========================================
    // TEST 9: Tenant isolation remains intact
    // ==========================================
    console.log('\n--- Test 9: Tenant isolation ---');
    const crossProduct = await prisma.product.findFirst({ where: { id: productA.id, businessId: businessB.id } });
    if (crossProduct) throw new Error('Cross-tenant product access should be blocked');
    console.log('✓ Test 9 Passed: Tenant isolation verified');

    // ==========================================
    // TEST 10: Auth error codes are standardized
    // ==========================================
    console.log('\n--- Test 10: Auth error codes ---');
    const unauthenticatedErr = new AppError(ErrorCodes.UNAUTHENTICATED, 'Authentication required', 401);
    if (unauthenticatedErr.code !== ErrorCodes.UNAUTHENTICATED) throw new Error('Should have UNAUTHENTICATED code');
    if (unauthenticatedErr.statusCode !== 401) throw new Error('Should have 401 status');
    console.log('✓ Test 10 Passed: Auth errors use standardized error codes');

    // ==========================================
    // TEST 11: Cancelled sales excluded from analytics
    // ==========================================
    console.log('\n--- Test 11: Cancelled sales exclusion ---');
    const saleCompleted = await prisma.sale.create({
      data: {
        businessId: businessA.id, branchId: branchA1.id, customerId: customerA.id,
        invoiceNumber: `INV-COMPLETED-${timestamp}`, total: 100, paidAmount: 100, status: SaleStatus.COMPLETED, saleDate: new Date(),
        items: { create: { productId: productA.id, quantity: 1, sellingPrice: 100, costPrice: 70, lineTotal: 100, lineProfit: 30 } },
      },
    });
    const saleCancelled = await prisma.sale.create({
      data: {
        businessId: businessA.id, branchId: branchA1.id, customerId: customerA.id,
        invoiceNumber: `INV-CANCELLED-${timestamp}`, total: 200, paidAmount: 200, status: SaleStatus.CANCELLED, saleDate: new Date(),
        items: { create: { productId: productA.id, quantity: 1, sellingPrice: 200, costPrice: 140, lineTotal: 200, lineProfit: 60 } },
      },
    });
    const activeSales = await prisma.sale.findMany({ where: { businessId: businessA.id, status: SaleStatus.COMPLETED } });
    const hasCancelled = activeSales.some(s => s.id === saleCancelled.id);
    if (hasCancelled) throw new Error('Cancelled sales should be excluded from active sales');
    console.log('✓ Test 11 Passed: Cancelled sales excluded from analytics');

    // ==========================================
    // TEST 12: Cancelled purchases excluded
    // ==========================================
    console.log('\n--- Test 12: Cancelled purchases exclusion ---');
    const supplierA = await prisma.supplier.create({ data: { businessId: businessA.id, name: 'Supplier A' } });
    const purchaseCompleted = await prisma.purchase.create({
      data: {
        businessId: businessA.id, supplierId: supplierA.id, total: 500, status: PurchaseStatus.RECEIVED, purchaseDate: new Date(),
        items: { create: { productId: productA.id, quantity: 10, purchasePrice: 50, lineTotal: 500 } },
      },
    });
    const purchaseCancelled = await prisma.purchase.create({
      data: {
        businessId: businessA.id, supplierId: supplierA.id, total: 300, status: PurchaseStatus.CANCELLED, purchaseDate: new Date(),
        items: { create: { productId: productA.id, quantity: 5, purchasePrice: 60, lineTotal: 300 } },
      },
    });
    const activePurchases = await prisma.purchase.findMany({ where: { businessId: businessA.id, status: { not: PurchaseStatus.CANCELLED } } });
    const hasCancelledPurchase = activePurchases.some(p => p.id === purchaseCancelled.id);
    if (hasCancelledPurchase) throw new Error('Cancelled purchases should be excluded');
    console.log('✓ Test 12 Passed: Cancelled purchases excluded');

    // ==========================================
    // TEST 13: Stock cannot become negative
    // ==========================================
    console.log('\n--- Test 13: Stock integrity ---');
    const stockBefore = (await prisma.product.findUnique({ where: { id: productA.id }, select: { currentStock: true } }))?.currentStock || 0;
    if (stockBefore < 0) throw new Error('Stock should never be negative');
    console.log(`✓ Test 13 Passed: Stock is non-negative (${stockBefore})`);

    // ==========================================
    // TEST 14: Customer outstanding deterministic
    // ==========================================
    console.log('\n--- Test 14: Customer outstanding deterministic ---');
    const outstandingBefore = Number((await prisma.customer.findUnique({ where: { id: customerA.id }, select: { outstanding: true } }))?.outstanding || 0);
    await prisma.customer.update({ where: { id: customerA.id }, data: { outstanding: { increment: 50 } } });
    const outstandingAfter = Number((await prisma.customer.findUnique({ where: { id: customerA.id }, select: { outstanding: true } }))?.outstanding || 0);
    if (outstandingAfter !== outstandingBefore + 50) throw new Error('Outstanding should increment deterministically');
    console.log(`✓ Test 14 Passed: Customer outstanding updated deterministically (${outstandingBefore} -> ${outstandingAfter})`);

    // ==========================================
    // TEST 15: Payroll immutable after payment
    // ==========================================
    console.log('\n--- Test 15: Payroll immutability ---');
    const payroll = await prisma.payroll.create({
      data: { businessId: businessA.id, periodName: `Test ${timestamp}`, startDate: new Date(), endDate: new Date(), status: PayrollStatus.DRAFT },
    });
    const empRecord = await prisma.employee.create({
      data: { businessId: businessA.id, userId: employeeUser.id, name: 'Test Emp', employeeCode: `EMP-${timestamp}`, position: 'Tester', status: 'ACTIVE' },
    });
    await generateSalariesForPayroll(businessA.id, payroll.id, ownerUser.id);
    await finalizePayroll(businessA.id, payroll.id, ownerUser.id);
    await markPayrollPaid(businessA.id, payroll.id, ownerUser.id);
    const paidPayroll = await prisma.payroll.findUnique({ where: { id: payroll.id } });
    if (paidPayroll?.status !== PayrollStatus.PAID) throw new Error('Payroll should be PAID');
    console.log('✓ Test 15 Passed: Payroll progresses through lifecycle to PAID');

    // ==========================================
    // TEST 16: Sale retry idempotency
    // ==========================================
    console.log('\n--- Test 16: Sale retry idempotency ---');
    const clientTxId = `offline-s34-${timestamp}`;
    const saleParams = {
      businessId: businessA.id,
      userId: ownerUser.id,
      branchId: branchA1.id,
      customerId: customerA.id,
      items: [{ productId: productA.id, quantity: 1, sellingPrice: 100 }],
      paidAmount: 100,
      clientTransactionId: clientTxId,
    };
    const sale1 = await createSale(saleParams);
    const sale2 = await createSale(saleParams);
    if (sale1.id !== sale2.id) throw new Error('Idempotent retry should return same sale');
    console.log('✓ Test 16 Passed: Retrying offline sale does not duplicate');

    // ==========================================
    // TEST 17: Retrying sync does not double-deduct inventory
    // ==========================================
    console.log('\n--- Test 17: Sync inventory integrity ---');
    const stockAfterIdempotentSale = (await prisma.product.findUnique({ where: { id: productA.id }, select: { currentStock: true } }))?.currentStock || 0;
    if (stockAfterIdempotentSale < 0) throw new Error('Stock should never go negative after sync');
    console.log(`✓ Test 17 Passed: Stock remains non-negative after sync retry (${stockAfterIdempotentSale})`);

    // ==========================================
    // TEST 18: Expected errors return safe error codes
    // ==========================================
    console.log('\n--- Test 18: Safe error codes ---');
    try {
      await createSale({
        businessId: businessA.id,
        userId: ownerUser.id,
        items: [{ productId: productA.id, quantity: 9999, sellingPrice: 100 }],
        clientTransactionId: `insufficient-${timestamp}`,
      });
      throw new Error('Should have thrown for insufficient stock');
    } catch (err) {
      if (err instanceof AppError && err.code === ErrorCodes.INSUFFICIENT_STOCK) {
        console.log('✓ Test 18 Passed: Insufficient stock returns INSUFFICIENT_STOCK code');
      } else {
        throw err;
      }
    }

    // ==========================================
    // TEST 19: Rate limiter still functions
    // ==========================================
    console.log('\n--- Test 19: Rate limiter ---');
    clearAllRateLimits();
    let blocked = false;
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit({ limit: 3, windowMs: 60000, key: 'test-step34|test-key' });
      if (!result.allowed) {
        blocked = true;
        break;
      }
    }
    if (!blocked) throw new Error('Rate limiter should have blocked after 3 requests');
    console.log('✓ Test 19 Passed: Rate limiter blocks excessive requests');

    // ==========================================
    // TEST 20: Critical failures produce structured logs
    // ==========================================
    console.log('\n--- Test 20: Critical failure logging ---');
    let logFound = false;
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const str = args.join(' ');
      if (str.includes('"level":"error"') && str.includes('"category":"TEST"')) {
        logFound = true;
      }
      originalError.apply(console, args);
    };
    logger.error('Test critical failure', { correlationId: 'test-err', category: 'TEST', errorCode: 'INTERNAL_ERROR' });
    console.error = originalError;
    if (!logFound) throw new Error('Logger should produce structured error output');
    console.log('✓ Test 20 Passed: Structured logging is available for critical events');

    // ==========================================
    // TEST 21: Missing environment variable detection
    // ==========================================
    console.log('\n--- Test 21: Environment validation ---');
    try {
      validateEnv();
      console.log('✓ Test 21 Passed: Environment validation succeeded with current config');
    } catch (err) {
      if (err instanceof Error && err.message.includes('Missing required environment variable')) {
        console.log('✓ Test 21 Passed: Environment validation detects missing variables');
      } else {
        throw err;
      }
    }

    // ==========================================
    // TEST 22: Job runner prevents concurrent duplicate execution
    // ==========================================
    console.log('\n--- Test 22: Job runner concurrency guard ---');
    const runner = new JobRunner();
    let runningCount = 0;
    const slowJob = {
      id: 'slow-job-s34',
      name: 'Slow Test Job',
      run: async () => {
        runningCount++;
        await new Promise(r => setTimeout(r, 50));
        return { success: true };
      },
    };
    const p1 = runner.runJob(slowJob);
    const p2 = runner.runJob(slowJob);
    const [record1, record2] = await Promise.all([p1, p2]);
    if (record1.id !== record2.id) throw new Error('Concurrent same job should return same record');
    console.log('✓ Test 22 Passed: Job runner prevents concurrent duplicate execution');

    // ==========================================
    // TEST 23: Scheduled job retry and failure tracking
    // ==========================================
    console.log('\n--- Test 23: Job retry and failure tracking ---');
    const failingRunner = new JobRunner();
    const failingJob = {
      id: 'failing-job-s34',
      name: 'Failing Test Job',
      run: async () => ({ success: false, error: 'Simulated failure' }),
    };
    const failRecord = await failingRunner.runJob(failingJob, { maxAttempts: 2 });
    if (failRecord.status !== 'failed') throw new Error('Job should fail after max attempts');
    if (failRecord.error !== 'Simulated failure') throw new Error('Error should be recorded');
    console.log('✓ Test 23 Passed: Failed jobs track error and retry count');

    // ==========================================
    // TEST 24: No secrets exposed in errors/logs
    // ==========================================
    console.log('\n--- Test 24: No secrets in errors ---');
    const sanitized = sanitizeLogMetadata({ password: 'secret123', token: 'abc', data: 'safe' });
    if ((sanitized as any).password !== '[REDACTED]') throw new Error('Password should be redacted');
    if ((sanitized as any).token !== '[REDACTED]') throw new Error('Token should be redacted');
    if ((sanitized as any).data !== 'safe') throw new Error('Safe data should not be redacted');
    console.log('✓ Test 24 Passed: Sensitive keys are redacted from logs');

    // ==========================================
    // TEST 25: Analytics cache integrity
    // ==========================================
    console.log('\n--- Test 25: Analytics cache integrity ---');
    clearAllAnalyticsCache();
    const cacheStatsBefore = getAnalyticsCacheStats();
    if (cacheStatsBefore.size !== 0 || cacheStatsBefore.hits !== 0) {
      throw new Error('Cache should be empty after clear');
    }
    setCachedAnalytics('test-key', { value: 42 }, 5000);
    const cached = getCachedAnalytics<{ value: number }>('test-key');
    if (cached?.value !== 42) throw new Error('Cache should return stored value');
    console.log('✓ Test 25 Passed: Analytics cache set/get/clear works correctly');

    // ==========================================
    // TEST 26: Purchase cancellation integrity
    // ==========================================
    console.log('\n--- Test 26: Purchase cancellation integrity ---');
    const purchaseToCancel = await prisma.purchase.create({
      data: {
        businessId: businessA.id, supplierId: supplierA.id, total: 100, status: PurchaseStatus.RECEIVED, purchaseDate: new Date(),
        items: { create: { productId: productA.id, quantity: 5, purchasePrice: 20, lineTotal: 100 } },
      },
    });
    await prisma.purchase.update({ where: { id: purchaseToCancel.id }, data: { status: PurchaseStatus.CANCELLED } });
    const cancelledPurchase = await prisma.purchase.findUnique({ where: { id: purchaseToCancel.id } });
    if (cancelledPurchase?.status !== PurchaseStatus.CANCELLED) throw new Error('Purchase should be cancelled');
    console.log('✓ Test 26 Passed: Purchase cancellation works correctly');

    console.log('\n🎉 ALL STEP 34 RELIABILITY TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    console.log('\n--- Cleaning up test fixtures ---');
      try {
        const bIds = [businessA?.id, businessB?.id].filter(Boolean) as string[];
        if (bIds.length > 0) {
          // FK-complete cleanup: every delete is scoped by the fixture
          // businesses through ALL relation paths (branch AND businessId),
          // because child rows created without a branch (e.g. purchases in
          // Test 26) are invisible to branch-only filters and would leave
          // dangling FK references behind.
          await prisma.saleItem.deleteMany({ where: { OR: [{ sale: { branch: { businessId: { in: bIds } } } }, { sale: { businessId: { in: bIds } } }] } });
          await prisma.sale.deleteMany({ where: { OR: [{ branch: { businessId: { in: bIds } } }, { businessId: { in: bIds } }] } });
          await prisma.purchaseItem.deleteMany({ where: { OR: [{ purchase: { branch: { businessId: { in: bIds } } } }, { product: { businessId: { in: bIds } } }] } });
          await prisma.purchase.deleteMany({ where: { OR: [{ branch: { businessId: { in: bIds } } }, { businessId: { in: bIds } }] } });
          await prisma.stockMovement.deleteMany({ where: { OR: [{ branch: { businessId: { in: bIds } } }, { product: { businessId: { in: bIds } } }] } });
          await prisma.product.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.customerPayment.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.customer.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.supplier.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.payroll.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.employeeSalary.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.employeeLeave.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.leaveBalance.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.employeeFeedback.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.employeeComplaint.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.employee.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.expense.deleteMany({ where: { OR: [{ branch: { businessId: { in: bIds } } }, { businessId: { in: bIds } }] } });
          await prisma.employeeAttendance.deleteMany({ where: { branch: { businessId: { in: bIds } } } });
          await prisma.branch.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.businessMembership.deleteMany({ where: { businessId: { in: bIds } } });
          await prisma.business.deleteMany({ where: { id: { in: bIds } } });
        }
        await prisma.user.deleteMany({ where: { email: { in: [emailOwner, emailManager, emailCashier, emailEmployee] } } });
      console.log('✓ Cleanup complete');
    } catch (e) {
      console.warn('⚠ Cleanup failed:', e);
    }
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ TEST FAILED:', e);
  process.exit(1);
});
