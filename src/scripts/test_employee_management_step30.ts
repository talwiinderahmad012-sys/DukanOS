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

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

async function expectThrow(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, 'expected an error but none was thrown');
  } catch (error) {
    check(name, true);
  }
}

async function main() {
  const { prisma } = await import('../lib/db/prisma');
  const employees = await import('../services/employees');
  const attendance = await import('../services/attendance');
  const leave = await import('../services/leave');
  const payrollSvc = await import('../services/payroll');
  const salariesSvc = await import('../services/salaries');
  const empNotify = await import('../services/employee-notification');
  const { normalizePkPhone } = await import('../lib/utils/phone');

  console.log('\n--- Starting Step 30 Advanced Employee Management Tests ---');

  const ts = Date.now();

  // ------------------------------------------------------------------
  // Fixtures: two isolated businesses, owner users, branches, employees
  // ------------------------------------------------------------------
  const ownerA = await prisma.user.create({
    data: { email: `ownerA_${ts}@test.com`, password: 'x', name: 'Owner A' },
  });
  const staffUserA = await prisma.user.create({
    data: { email: `staff_${ts}@test.com`, password: 'x', name: 'Staff A' },
  });

  const bizA = await prisma.business.create({
    data: { name: `BizA_${ts}` },
  });
  const bizB = await prisma.business.create({
    data: { name: `BizB_${ts}` },
  });

  await prisma.businessMembership.create({
    data: { userId: ownerA.id, businessId: bizA.id, role: 'OWNER' },
  });
  await prisma.businessMembership.create({
    data: { userId: staffUserA.id, businessId: bizA.id, role: 'EMPLOYEE' },
  });

  const branchA = await prisma.branch.create({
    data: { businessId: bizA.id, name: 'Branch A1', code: `BA1_${ts}` },
  });
  const branchB = await prisma.branch.create({
    data: { businessId: bizB.id, name: 'Branch B1', code: `BB1_${ts}` },
  });

  // Employee A linked to staffUserA (self-approval & notification tests)
  const empA = await employees.createEmployee(bizA.id, ownerA.id, {
    name: 'Ali Raza',
    phone: '03001234567',
    position: 'Cashier',
    basicSalary: 70000,
    branchId: branchA.id,
  } as any);
  await prisma.employee.update({ where: { id: empA.id }, data: { userId: staffUserA.id } });

  const empB = await employees.createEmployee(bizA.id, ownerA.id, {
    name: 'Bilal Ahmed',
    phone: '+923219876543',
    position: 'Helper',
    basicSalary: 35000,
    branchId: branchA.id,
  } as any);

  const empC = await employees.createEmployee(bizB.id, ownerA.id, {
    name: 'Other Tenant',
    position: 'Cashier',
    basicSalary: 10000,
  } as any);

  // ------------------------------------------------------------------
  // [1] Phone normalization (Pakistani format)
  // ------------------------------------------------------------------
  console.log('\n[1] Phone normalization');
  check('03001234567 -> +92', normalizePkPhone('03001234567') === '+923001234567');
  check('3001234567 -> +92', normalizePkPhone('3001234567') === '+923001234567');
  check('+44 intl untouched', normalizePkPhone('+441234567890') === '+441234567890');
  const storedPhone = (await prisma.employee.findUniqueOrThrow({ where: { id: empA.id } })).phone;
  check('phone normalized at rest', storedPhone === '+923001234567', String(storedPhone));

  // ------------------------------------------------------------------
  // [2] Tenant isolation / role authorization
  // ------------------------------------------------------------------
  console.log('\n[2] Tenant isolation');
  await expectThrow('cross-business employee read blocked', () =>
    employees.getEmployeeById(bizB.id, empA.id)
  );
  await expectThrow('cross-business salary change blocked', () =>
    employees.updateSalaryStructure(bizB.id, ownerA.id, {
      employeeId: empA.id,
      basicSalary: 999,
    })
  );
  const balancesA = await leave.getEmployeeLeaveBalances(bizA.id, empA.id);
  check('balances tenant-scoped with defaults', balancesA.length === 4 && balancesA[0].remaining > 0);

  // ------------------------------------------------------------------
  // [3] Branch assignment
  // ------------------------------------------------------------------
  console.log('\n[3] Branch assignment');
  await expectThrow('foreign branch rejected', () =>
    employees.assignBranch(bizA.id, ownerA.id, empB.id, branchB.id)
  );
  const moved = await employees.assignBranch(bizA.id, ownerA.id, empB.id, null);
  check('branch cleared in own business', moved.branchId === null);
  await employees.assignBranch(bizA.id, ownerA.id, empB.id, branchA.id);

  // ------------------------------------------------------------------
  // [4] Attendance: duplicate prevention, check-in/out, late marking
  // ------------------------------------------------------------------
  console.log('\n[4] Attendance');
  const day = new Date();

  const att1 = await attendance.recordAttendance(bizA.id, ownerA.id, {
    employeeId: empA.id,
    date: day,
    status: 'PRESENT',
  } as any);
  const att2 = await attendance.recordAttendance(bizA.id, ownerA.id, {
    employeeId: empA.id,
    date: day,
    status: 'HALF_DAY',
    notes: 'corrected by manager',
  } as any);
  check('one record per employee per day', att1.id === att2.id);

  const overrides = await prisma.auditLog.count({
    where: { businessId: bizA.id, action: 'ATTENDANCE_MANUAL_OVERRIDE', entityId: att1.id },
  });
  check('manual override audited with previous status', overrides >= 1);

  // Late check-in for empB (11:00 > 09:15 cutoff)
  const lateTime = new Date();
  lateTime.setHours(11, 0, 0, 0);
  const ci = await attendance.checkInEmployee(bizA.id, empB.id, staffUserA.id, {
    date: day,
    checkInTime: lateTime,
  });
  check('late check-in marked LATE (rule-based)', ci.status === 'LATE');

  await expectThrow('duplicate check-in blocked', () =>
    attendance.checkInEmployee(bizA.id, empB.id, staffUserA.id, { date: day })
  );

  const co = await attendance.checkOutEmployee(bizA.id, empB.id, staffUserA.id, {
    date: day,
    checkOutTime: new Date(lateTime.getTime() + 8 * 60 * 60 * 1000),
  });
  check('check-out recorded', !!co.checkOut);
  await expectThrow('double check-out blocked', () =>
    attendance.checkOutEmployee(bizA.id, empB.id, staffUserA.id, { date: day })
  );

  // On-time check-in for empA marks PRESENT
  const early = new Date();
  early.setHours(8, 30, 0, 0);
  const ciA = await attendance.checkInEmployee(bizA.id, empA.id, staffUserA.id, {
    date: day,
    checkInTime: early,
  });
  check('on-time check-in PRESENT', ciA.status === 'PRESENT');

  // ------------------------------------------------------------------
  // [5] Leave: application, self-approval block, approval, balances
  // ------------------------------------------------------------------
  console.log('\n[5] Leave management');
  const leaveStart = new Date();
  leaveStart.setDate(leaveStart.getDate() + 10);
  const leaveEnd = new Date(leaveStart);
  leaveEnd.setDate(leaveEnd.getDate() + 1); // 2 days

  const req = await leave.createLeaveRequest(bizA.id, staffUserA.id, {
    employeeId: empA.id,
    leaveType: 'SICK',
    startDate: leaveStart,
    endDate: leaveEnd,
    reason: 'Fever and flu',
  });

  // Self-approval must be blocked (empA is linked to staffUserA)
  await expectThrow('self-approval blocked', () =>
    leave.reviewLeaveRequest(bizA.id, staffUserA.id, req.id, 'APPROVED')
  );

  await leave.reviewLeaveRequest(bizA.id, ownerA.id, req.id, 'APPROVED', 'Get well soon');
  const afterApproval = await prisma.employeeLeave.findUniqueOrThrow({ where: { id: req.id } });
  check('leave APPROVED with reviewedAt', afterApproval.status === 'APPROVED' && !!afterApproval.reviewedAt);

  const sickBalance = (await leave.getEmployeeLeaveBalances(bizA.id, empA.id)).find((b) => b.leaveType === 'SICK')!;
  check('balance deducted on approval (used=2)', sickBalance.used === 2 && sickBalance.remaining === 8);

  const reflected = await prisma.employeeAttendance.count({
    where: {
      businessId: bizA.id,
      employeeId: empA.id,
      status: 'LEAVE',
      date: { gte: new Date(leaveStart.getFullYear(), leaveStart.getMonth(), leaveStart.getDate()), lte: leaveEnd },
    },
  });
  check('approved leave reflected in attendance', reflected === 2);

  // Over-balance request must be rejected at approval time
  const bigStart = new Date();
  bigStart.setDate(bigStart.getDate() + 40);
  const bigEnd = new Date(bigStart);
  bigEnd.setDate(bigEnd.getDate() + 12); // 13 days > default SICK allowance of 10
  const bigReq = await leave.createLeaveRequest(bizA.id, staffUserA.id, {
    employeeId: empA.id,
    leaveType: 'SICK',
    startDate: bigStart,
    endDate: bigEnd,
    reason: 'Long illness',
  });
  await expectThrow('over-balance approval blocked (no negative balance)', () =>
    leave.reviewLeaveRequest(bizA.id, ownerA.id, bigReq.id, 'APPROVED')
  );
  const rejectedBig = await prisma.employeeLeave.findUniqueOrThrow({ where: { id: bigReq.id } });
  check('over-balance request stays PENDING after failed approval', rejectedBig.status === 'PENDING');

  // Cancel the approved leave -> balance reversal + attendance cleanup
  await leave.cancelLeaveRequest(bizA.id, ownerA.id, req.id, {
    isPrivileged: true,
    reason: 'Employee recovered',
  });
  const sickAfterCancel = (await leave.getEmployeeLeaveBalances(bizA.id, empA.id)).find((b) => b.leaveType === 'SICK')!;
  check('balance reversed on cancellation (used=0)', sickAfterCancel.used === 0);
  const reflectedAfterCancel = await prisma.employeeAttendance.count({
    where: {
      businessId: bizA.id,
      employeeId: empA.id,
      status: 'LEAVE',
      date: { gte: new Date(leaveStart.getFullYear(), leaveStart.getMonth(), leaveStart.getDate()), lte: leaveEnd },
    },
  });
  check('attendance LEAVE markers removed on cancellation', reflectedAfterCancel === 0);

  // ------------------------------------------------------------------
  // [6] Payroll: generation, Decimal accuracy, immutability
  // ------------------------------------------------------------------
  console.log('\n[6] Payroll');
  const pStart = new Date();
  pStart.setDate(pStart.getDate() - 20);
  pStart.setHours(0, 0, 0, 0);
  const pEnd = new Date(pStart);
  pEnd.setDate(pEnd.getDate() + 6); // 7-day period

  const d1 = new Date(pStart);
  const d2 = new Date(pStart); d2.setDate(d2.getDate() + 1);
  const d3 = new Date(pStart); d3.setDate(d3.getDate() + 2);
  await attendance.recordAttendance(bizA.id, ownerA.id, { employeeId: empA.id, date: d1, status: 'PRESENT' } as any);
  await attendance.recordAttendance(bizA.id, ownerA.id, { employeeId: empA.id, date: d2, status: 'LATE' } as any);
  await attendance.recordAttendance(bizA.id, ownerA.id, { employeeId: empA.id, date: d3, status: 'ABSENT' } as any);

  const payroll = await payrollSvc.createPayrollPeriod(bizA.id, ownerA.id, {
    periodName: `STEP30_${ts}`,
    startDate: pStart,
    endDate: pEnd,
  });

  const generatedCount = await payrollSvc.generateSalariesForPayroll(bizA.id, payroll.id, ownerA.id);
  check('salaries generated for all active employees', generatedCount === 2);

  // Deterministic Decimal math: 70,000 / 7 = 10,000/day; 1 absent day -> 10,000 deduction
  const salaryA = await prisma.employeeSalary.findFirstOrThrow({
    where: { payrollId: payroll.id, employeeId: empA.id },
  });
  check('Decimal net pay exact (60000.00)', salaryA.netSalary.toFixed(2) === '60000.00', salaryA.netSalary.toFixed(2));
  check('deduction snapshot exact', salaryA.deductions.toFixed(2) === '10000.00');
  check('base salary snapshotted at generation', salaryA.baseSalary.toFixed(2) === '70000.00');

  const salaryB = await prisma.employeeSalary.findFirstOrThrow({
    where: { payrollId: payroll.id, employeeId: empB.id },
  });
  check('no attendance impact -> full pay', salaryB.netSalary.toFixed(2) === '35000.00');

  // Later salary change must NOT alter the generated payroll
  await employees.updateSalaryStructure(bizA.id, ownerA.id, {
    employeeId: empA.id,
    basicSalary: 80000,
    reason: 'Annual raise',
  });
  const salaryAfterRaise = await prisma.employeeSalary.findUniqueOrThrow({ where: { id: salaryA.id } });
  check('historical payroll unaffected by raise', salaryAfterRaise.netSalary.toFixed(2) === '60000.00');

  await expectThrow('cannot re-generate after finalization', async () => {
    await payrollSvc.finalizePayroll(bizA.id, payroll.id, ownerA.id);
    await payrollSvc.generateSalariesForPayroll(bizA.id, payroll.id, ownerA.id);
  });

  await expectThrow('salary edit blocked on finalized payroll', () =>
    salariesSvc.createSalaryRecord(bizA.id, ownerA.id, {
      employeeId: empA.id,
      period: `STEP30_${ts}`,
      baseSalary: 1,
    })
  );

  // markPayrollPaid settles everything transactionally
  await payrollSvc.markPayrollPaid(bizA.id, payroll.id, ownerA.id, 'CASH' as any);
  const paidPayroll = await prisma.payroll.findUniqueOrThrow({ where: { id: payroll.id } });
  const unpaidLeft = await prisma.employeeSalary.count({
    where: { payrollId: payroll.id, paymentStatus: 'PENDING' },
  });
  check('payroll PAID and all items settled', paidPayroll.status === 'PAID' && unpaidLeft === 0);

  await expectThrow('PAID payroll cannot be cancelled', () =>
    payrollSvc.cancelPayroll(bizA.id, payroll.id, ownerA.id, 'test')
  );

  // CANCELLED path preserves history
  const payroll2 = await payrollSvc.createPayrollPeriod(bizA.id, ownerA.id, {
    periodName: `STEP30_CANCEL_${ts}`,
    startDate: pStart,
    endDate: pEnd,
  });
  await payrollSvc.cancelPayroll(bizA.id, payroll2.id, ownerA.id, 'Created by mistake');
  const cancelledRow = await prisma.payroll.findUniqueOrThrow({ where: { id: payroll2.id } });
  check('cancelled payroll retained as CANCELLED', cancelledRow.status === 'CANCELLED');

  // ------------------------------------------------------------------
  // [7] Salary history / deactivation / audit trail
  // ------------------------------------------------------------------
  console.log('\n[7] Salary history / deactivation / audit');
  const historyRows = await prisma.employeeSalaryHistory.findMany({
    where: { employeeId: empA.id },
  });
  check(
    'salary structure change recorded in history',
    historyRows.some((h) => h.previousSalary.toFixed(2) === '70000.00' && h.newSalary.toFixed(2) === '80000.00')
  );

  const deactivated = await employees.deactivateEmployee(bizB.id, ownerA.id, empC.id, 'LEFT', 'Resigned');
  check('employee deactivated with LEFT status', deactivated.status === 'LEFT');

  const auditActions = await prisma.auditLog.findMany({
    where: { businessId: bizA.id, entityType: 'Payroll', entityId: payroll.id },
    select: { action: true },
  });
  const auditSet = new Set(auditActions.map((a) => a.action));
  check(
    'audit log covers payroll lifecycle',
    auditSet.has('PAYROLL_GENERATED_SALARIES') && auditSet.has('PAYROLL_FINALIZED') && auditSet.has('PAYROLL_PAID')
  );
  const leaveAudits = await prisma.auditLog.count({
    where: { businessId: bizA.id, action: { in: ['LEAVE_APPROVED', 'LEAVE_CANCELLED'] } },
  });
  check('leave decisions audited', leaveAudits >= 2);

  // ------------------------------------------------------------------
  // [8] Employee notifications (scoped)
  // ------------------------------------------------------------------
  console.log('\n[8] Notifications');
  await empNotify.notifyEmployee(bizA.id, empA.id, {
    title: 'Shift update',
    message: 'Your shift starts at 9 AM tomorrow.',
  });
  const staffNotifs = await empNotify.getEmployeeNotifications(bizA.id, staffUserA.id);
  check('notification delivered to linked employee user', staffNotifs.some((n) => n.title === 'Shift update'));
  const ownerNotifs = await empNotify.getEmployeeNotifications(bizA.id, ownerA.id);
  check("another user cannot see employee's notifications", !ownerNotifs.some((n) => n.title === 'Shift update'));
  const noop = await empNotify.notifyEmployee(bizA.id, empB.id, {
    title: 'Should not crash',
    message: 'No linked user.',
  });
  check('notifyEmployee no-op safe without linked user', noop === null);

  // ------------------------------------------------------------------
  // Cleanup (cascades remove employee/attendance/payroll/notification data)
  // ------------------------------------------------------------------
  console.log('\nCleaning up test data...');
  await prisma.business.deleteMany({ where: { id: { in: [bizA.id, bizB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, staffUserA.id] } } });

  console.log(`\n--- STEP 30 TESTS COMPLETE: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('FATAL TEST ERROR:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import('../lib/db/prisma');
    await prisma.$disconnect();
  });
