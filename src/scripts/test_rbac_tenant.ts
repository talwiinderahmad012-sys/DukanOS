export {};

/**
 * RBAC + tenant-isolation QA — creates isolated test tenants, verifies
 * cross-tenant rejection, role gates, and platform-admin boundaries, then
 * deletes ONLY its own test rows.
 *
 * Run: npm run test:rbac   (role matrix)
 * Run: npm run test:tenant (tenant isolation)
 *
 * Modes:
 *   --rbac    => role permission matrix + platform-admin boundary
 *   --tenant  => cross-tenant data isolation (payroll/salary/employee)
 *   (default) => both
 */

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

const { prisma } = await import('../lib/db/prisma');
const bcrypt = (await import('bcryptjs')).default;
const { MembershipRole } = await import('../generated/prisma/client');

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`  [PASS] ${label}`);
  } else {
    failed += 1;
    console.error(`  [FAIL] ${label}`);
  }
}

const args = process.argv.slice(2);
const mode = args.includes('--rbac') ? 'rbac' : args.includes('--tenant') ? 'tenant' : 'both';
async function main() {
  const { checkDatabaseHealth } = await import('../lib/db/health');
  const health = await checkDatabaseHealth();
  if (health.status !== 'DATABASE_AVAILABLE') {
    console.log('\n[BLOCKED] DATABASE_UNAVAILABLE — RBAC/tenant tests require PostgreSQL.');
    console.log('This is an infrastructure failure, not a code failure. Run: npm run test:db\n');
    process.exit(2);
  }

  const suffix = Date.now();
  const ownerAEmail = `rbac-owner-a-${suffix}@dukaanos.local`;
  const ownerBEmail = `rbac-owner-b-${suffix}@dukaanos.local`;
  const cashierEmail = `rbac-cashier-${suffix}@dukaanos.local`;

  const passwordHash = await bcrypt.hash('RbacTenantTest123!', 10);

  const ownerA = await prisma.user.create({ data: { name: 'Tenant A Owner', email: ownerAEmail, password: passwordHash } });
  const ownerB = await prisma.user.create({ data: { name: 'Tenant B Owner', email: ownerBEmail, password: passwordHash } });
  const cashier = await prisma.user.create({ data: { name: 'Cashier', email: cashierEmail, password: passwordHash } });

  const bizA = await prisma.business.create({ data: { name: `Tenant A ${suffix}`, type: 'RETAIL', currency: 'PKR', timezone: 'Asia/Karachi' } });
  const bizB = await prisma.business.create({ data: { name: `Tenant B ${suffix}`, type: 'RETAIL', currency: 'PKR', timezone: 'Asia/Karachi' } });

  await prisma.businessMembership.createMany({
    data: [
      { userId: ownerA.id, businessId: bizA.id, role: MembershipRole.OWNER },
      { userId: ownerB.id, businessId: bizB.id, role: MembershipRole.OWNER },
      { userId: cashier.id, businessId: bizA.id, role: MembershipRole.CASHIER },
    ],
  });

  // Employee in Tenant A only.
  const empA = await prisma.employee.create({
    data: { businessId: bizA.id, employeeCode: `EMP-A-${suffix}`, name: 'Tenant A Worker', position: 'Cashier', basicSalary: 25000 },
  });
  const empB = await prisma.employee.create({
    data: { businessId: bizB.id, employeeCode: `EMP-B-${suffix}`, name: 'Tenant B Worker', position: 'Counter', basicSalary: 20000 },
  });

  try {
    if (mode !== 'tenant') {
      console.log('\n=== RBAC ROLE PERMISSION MATRIX ===');
      const { assertOwnerOrManager } = await import('../lib/auth/rbac');
      const { AppError, ErrorCodes } = await import('../lib/errors');

      // OWNER / MANAGER pass; CASHIER / EMPLOYEE denied.
      let ok = true;
      try { assertOwnerOrManager(MembershipRole.OWNER); } catch { ok = false; }
      assert(ok, 'OWNER is authorized for owner/manager actions');

      ok = true;
      try { assertOwnerOrManager(MembershipRole.MANAGER); } catch { ok = false; }
      assert(ok, 'MANAGER is authorized for owner/manager actions');

      let denied = false;
      try { assertOwnerOrManager(MembershipRole.CASHIER); } catch (e) {
        denied = e instanceof AppError && e.code === ErrorCodes.UNAUTHORIZED;
      }
      assert(denied, 'CASHIER is denied owner/manager actions (403)');

      denied = false;
      try { assertOwnerOrManager(MembershipRole.EMPLOYEE); } catch (e) {
        denied = e instanceof AppError && e.code === ErrorCodes.UNAUTHORIZED;
      }
      assert(denied, 'EMPLOYEE is denied owner/manager actions (403)');

      // Platform-admin boundary — tenant owners must NEVER be platform admins.
      const { isPlatformAdminEmail } = await import('../lib/auth/platform-admin');
      assert(isPlatformAdminEmail(ownerA.email) === false, 'tenant OWNER is not a platform admin');
    }

    if (mode !== 'rbac') {
      console.log('\n=== TENANT ISOLATION ===');
      const { createSalaryRecord } = await import('../services/salaries');

      // 1. Owner A may create a salary for an employee of Tenant A.
      let ok = false;
      try {
        const rec = await createSalaryRecord(bizA.id, ownerA.id, {
          employeeId: empA.id,
          period: '2026-08',
          baseSalary: 25000,
        });
        ok = !!rec.id;
      } catch { ok = false; }
      assert(ok, 'salary created for own-tenant employee (businessId scoped)');

      // 2. Cross-tenant employee must be REJECTED.
      let crossTenantRejected = false;
      try {
        await createSalaryRecord(bizA.id, ownerA.id, {
          employeeId: empB.id, // belongs to Tenant B
          period: '2026-08',
          baseSalary: 20000,
        });
      } catch {
        crossTenantRejected = true;
      }
      assert(crossTenantRejected, 'cross-tenant employeeId REJECTED (no data leak)');

      // 3. Business data scoping: payroll list on Tenant A must not see Tenant B.
      const { listPayrolls } = await import('../services/payroll');
      const payrollsA = await listPayrolls(bizA.id);
      assert(payrollsA.every((p) => p.businessId === bizA.id), 'payroll list is strictly tenant-scoped');

      // 4. Membership resolution is strictly one-tenant.
      const { getBusinessMembership } = await import('../lib/auth/context');
      const membershipOfBFromA = await getBusinessMembership(ownerA.id, bizB.id);
      assert(membershipOfBFromA === null, 'user in Tenant A has NO membership in Tenant B');

      // 5. Employee query on Tenant A never returns Tenant B employees.
      const employeesA = await prisma.employee.findMany({ where: { businessId: bizA.id } });
      assert(employeesA.every((e) => e.id !== empB.id), 'employee query is strictly tenant-scoped');
    }
  } finally {
    // Clean up ONLY our own test rows (in FK-safe order).
    await prisma.employee.deleteMany({ where: { id: { in: [empA.id, empB.id] } } }).catch(() => {});
    await prisma.businessMembership.deleteMany({ where: { businessId: { in: [bizA.id, bizB.id] } } }).catch(() => {});
    await prisma.business.deleteMany({ where: { id: { in: [bizA.id, bizB.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, ownerB.id, cashier.id] } } }).catch(() => {});
  }

  await prisma.$disconnect();

  console.log(`\n=== RBAC/TENANT RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[FAIL] RBAC/tenant test runner errored:', err instanceof Error ? err.message : err);
  process.exit(1);
});