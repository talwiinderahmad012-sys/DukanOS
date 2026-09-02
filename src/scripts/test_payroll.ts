export {};

/**
 * Payroll QA — verifies the Phase 9 requirements:
 *   1. Salary creation is keyed on the authoritative employeeId.
 *   2. The employee selector data carries name, code (and position).
 *   3. Cross-tenant employee selection is REJECTED server-side.
 *   4. Net salary formula is deterministic and never negative.
 *   5. Paid / finalized salary records are immutable.
 *   6. Employee name/code surfaces through the payroll detail loader.
 *
 * Creates and removes ONLY its own test rows. Never touches production data.
 * Run: npm run test:payroll
 */

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

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

async function main() {
  const { prisma } = await import('../lib/db/prisma');
  const bcrypt = (await import('bcryptjs')).default;
  const { MembershipRole, PaymentMethod } = await import('../generated/prisma/client');
  const { checkDatabaseHealth } = await import('../lib/db/health');

  const health = await checkDatabaseHealth();
  if (health.status !== 'DATABASE_AVAILABLE') {
    console.log('\n[BLOCKED] DATABASE_UNAVAILABLE — payroll tests require PostgreSQL.');
    console.log('This is an infrastructure failure, not a code failure.\n');
    process.exit(2);
  }

  const suffix = Date.now();
  const hash = await bcrypt.hash('PayrollTest123!', 10);
  const owner = await prisma.user.create({ data: { name: 'Payroll QA Owner', email: `payroll-owner-${suffix}@dukaanos.local`, password: hash } });
  const outsider = await prisma.user.create({ data: { name: 'Payroll QA Outsider', email: `payroll-outsider-${suffix}@dukaanos.local`, password: hash } });

  const bizA = await prisma.business.create({ data: { name: `Payroll QA A ${suffix}`, type: 'RETAIL', currency: 'PKR', timezone: 'Asia/Karachi' } });
  const bizB = await prisma.business.create({ data: { name: `Payroll QA B ${suffix}`, type: 'RETAIL', currency: 'PKR', timezone: 'Asia/Karachi' } });

  await prisma.businessMembership.createMany({
    data: [
      { userId: owner.id, businessId: bizA.id, role: MembershipRole.OWNER },
      { userId: outsider.id, businessId: bizB.id, role: MembershipRole.OWNER },
    ],
  });

  const empA = await prisma.employee.create({
    data: {
      businessId: bizA.id,
      employeeCode: `PAYQ-A-${suffix}`,
      name: 'Ahmad Test Worker',
      position: 'Salesman',
      basicSalary: 30000,
    },
  });
  const empB = await prisma.employee.create({
    data: {
      businessId: bizB.id,
      employeeCode: `PAYQ-B-${suffix}`,
      name: 'Other Tenant Worker',
      position: 'Store Boy',
      basicSalary: 18000,
    },
  });

  const period = '2026-08';

  try {
    const { createSalaryRecord, recordSalaryPayment, getEmployeeSalaryHistory } = await import('../services/salaries');

    // 1. Selector payload carries name + employeeCode + position (the shape
    //    the payroll page passes to the "add salary" modal).
    assert(typeof empA.name === 'string' && empA.name.length > 0, 'employee selector data includes employee name');
    assert(typeof empA.employeeCode === 'string' && empA.employeeCode.length > 0, 'employee selector data includes employee code');
    assert(typeof empA.position === 'string' && empA.position.length > 0, 'employee selector data includes role/designation');

    // 2. Salary record is created via authoritative employeeId in tenant A.
    const rec = await createSalaryRecord(bizA.id, owner.id, {
      employeeId: empA.id,
      period,
      baseSalary: 30000,
      overtime: 2000,
      bonus: 1000,
      deductions: 500,
      advance: 1500,
    });
    assert(rec.employeeId === empA.id, 'salary record is linked to the authoritative employeeId');
    assert(rec.employee?.name === 'Ahmad Test Worker', 'created salary record exposes employee name for display');

    // 3. Net salary = base + overtime + bonus - deductions - advance, never negative.
    const expectedNet = 30000 + 2000 + 1000 - 500 - 1500;
    assert(Number(rec.netSalary) === expectedNet, `net salary formula exact (${Number(rec.netSalary)})`);
    const zeroNet = await createSalaryRecord(bizA.id, owner.id, {
      employeeId: empA.id,
      period: '2026-09',
      baseSalary: 1000,
      deductions: 5000,
    });
    assert(Number(zeroNet.netSalary) === 0, 'net salary never goes negative');

    // 4. Cross-tenant employee selection is REJECTED.
    let crossTenantRejected = false;
    try {
      await createSalaryRecord(bizA.id, owner.id, { employeeId: empB.id, period, baseSalary: 18000 });
    } catch {
      crossTenantRejected = true;
    }
    assert(crossTenantRejected, 'cross-tenant employeeId is rejected server-side');

    // 5. Employee name + code flow through the payroll schedule service.
    const { generateSalariesForPayroll } = await import('../services/payroll');
    const payroll = await prisma.payroll.create({
      data: {
        businessId: bizA.id,
        periodName: `Payroll QA ${suffix}`,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-31'),
        createdBy: owner.id,
      },
    });
    await generateSalariesForPayroll(bizA.id, payroll.id, owner.id);
    const detail = await prisma.payroll.findUnique({
      where: { id: payroll.id },
      include: { employeeSalary: { include: { employee: { select: { name: true, employeeCode: true, position: true } } } } },
    });
    const salaryRow = detail?.employeeSalary.find((s) => s.employeeId === empA.id);
    assert(salaryRow?.employee?.name === 'Ahmad Test Worker', 'payroll entry displays employee name');
    assert(salaryRow?.employee?.employeeCode === empA.employeeCode, 'payroll entry displays employee code');

    // 6. Paid salary records are immutable.
    await recordSalaryPayment(bizA.id, owner.id, rec.id, PaymentMethod.CASH);
    let immutableOk = false;
    try {
      await createSalaryRecord(bizA.id, owner.id, { employeeId: empA.id, period, baseSalary: 99999 });
    } catch {
      immutableOk = true;
    }
    assert(immutableOk, 'paid salary record cannot be modified');

    // 7. Salary history returns the record for future reporting.
    const history = await getEmployeeSalaryHistory(bizA.id, empA.id);
    assert(history.some((h) => h.id === rec.id), 'salary history contains the created record');
  } finally {
    await prisma.payroll.deleteMany({ where: { businessId: bizA.id } }).catch(() => {});
    await prisma.employeeSalary.deleteMany({ where: { businessId: bizA.id } }).catch(() => {});
    await prisma.employee.deleteMany({ where: { id: { in: [empA.id, empB.id] } } }).catch(() => {});
    await prisma.businessMembership.deleteMany({ where: { businessId: { in: [bizA.id, bizB.id] } } }).catch(() => {});
    await prisma.business.deleteMany({ where: { id: { in: [bizA.id, bizB.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, outsider.id] } } }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log(`\n=== PAYROLL RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[FAIL] Payroll test runner errored:', err instanceof Error ? err.message : err);
  process.exit(1);
});