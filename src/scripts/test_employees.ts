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
  console.log('--- STARTING STEP 10: EMPLOYEE & STAFF MANAGEMENT INTEGRATION TESTS ---');

  const { prisma } = await import('../lib/db/prisma');
  const { 
    EmployeeStatus, 
    SalaryType, 
    AttendanceStatus, 
    LeaveStatus, 
    LeaveType, 
    ComplaintStatus, 
    ComplaintPriority,
    PaymentMethod
  } = await import('../generated/prisma/client');
  const { 
    createEmployee, 
    updateEmployee, 
    archiveEmployee, 
    getEmployeeById, 
    listEmployees, 
    generateNextEmployeeCode 
  } = await import('../services/employees');
  const { 
    recordAttendance, 
    getDailyAttendance, 
    getMonthlyAttendanceSummary 
  } = await import('../services/attendance');
  const { 
    createLeaveRequest, 
    reviewLeaveRequest 
  } = await import('../services/leave');
  const { 
    createSalaryRecord, 
    recordSalaryPayment, 
    getEmployeeSalaryHistory 
  } = await import('../services/salaries');
  const { 
    createComplaint, 
    resolveComplaint, 
    listComplaints 
  } = await import('../services/complaints');

  const timestamp = Date.now();
  const testEmailA = `test-emp-owner-a-${timestamp}@example.com`;
  const testEmailB = `test-emp-owner-b-${timestamp}@example.com`;
  const testEmpUserEmail = `test-staff-user-${timestamp}@example.com`;

  // 1. Setup Test Businesses and Users
  const userA = await prisma.user.create({
    data: { name: 'Emp Owner A', email: testEmailA },
  });

  const bizA = await prisma.business.create({
    data: {
      name: `Staff Store A ${timestamp}`,
      memberships: {
        create: { userId: userA.id, role: 'OWNER' },
      },
    },
  });

  const userB = await prisma.user.create({
    data: { name: 'Emp Owner B', email: testEmailB },
  });

  const bizB = await prisma.business.create({
    data: {
      name: `Staff Store B ${timestamp}`,
      memberships: {
        create: { userId: userB.id, role: 'OWNER' },
      },
    },
  });

  const staffUser = await prisma.user.create({
    data: { name: 'Bilal Cashier', email: testEmpUserEmail },
  });

  console.log('✓ Initialized test businesses and users.');

  // --- TEST 1: Employee Creation & Auto-Code Generation ---
  console.log('\n--- Running Test 1: Employee Creation & Unique Code Generation ---');
  const code1 = await generateNextEmployeeCode(bizA.id);
  if (code1 !== 'EMP-001') {
    throw new Error(`Expected first code to be EMP-001, got ${code1}`);
  }

  const emp1 = await createEmployee(bizA.id, userA.id, {
    name: 'Bilal Cashier',
    position: 'Head Cashier',
    department: 'Sales',
    phone: '0300-1122334',
    basicSalary: 35000,
    salaryType: SalaryType.MONTHLY,
  });

  if (emp1.employeeCode !== 'EMP-001') {
    throw new Error(`Expected auto-generated code EMP-001, got ${emp1.employeeCode}`);
  }

  const emp2 = await createEmployee(bizA.id, userA.id, {
    name: 'Zahid Storekeeper',
    position: 'Storekeeper',
    basicSalary: 25000,
  });

  if (emp2.employeeCode !== 'EMP-002') {
    throw new Error(`Expected second auto-code EMP-002, got ${emp2.employeeCode}`);
  }

  // Verify duplicate code in same business is blocked
  let dupFailed = false;
  try {
    await createEmployee(bizA.id, userA.id, {
      name: 'Duplicate Code Person',
      employeeCode: 'EMP-001',
      position: 'Helper',
    });
  } catch (e: any) {
    dupFailed = true;
  }
  if (!dupFailed) {
    throw new Error('Duplicate employee code within same business was NOT blocked!');
  }
  console.log('✓ Test 1 Passed: Employee creation and business-scoped unique code generation verified.');

  // --- TEST 2: Employee Update & Archiving ---
  console.log('\n--- Running Test 2: Employee Profile Update & Archiving ---');
  const updatedEmp1 = await updateEmployee(bizA.id, userA.id, emp1.id, {
    position: 'Senior Cashier & Shift Lead',
    basicSalary: 40000,
  });

  if (updatedEmp1.position !== 'Senior Cashier & Shift Lead' || Number(updatedEmp1.basicSalary) !== 40000) {
    throw new Error(`Employee update failed!`);
  }

  const archivedEmp2 = await archiveEmployee(bizA.id, userA.id, emp2.id);
  if (archivedEmp2.status !== EmployeeStatus.INACTIVE) {
    throw new Error(`Employee archiving failed!`);
  }
  console.log('✓ Test 2 Passed: Profile update and archiving behavior verified.');

  // --- TEST 3: Attendance Recording & Same-Day Upsert ---
  console.log('\n--- Running Test 3: Attendance Recording & Same-Day Upsert ---');
  const today = new Date();
  const att1 = await recordAttendance(bizA.id, userA.id, {
    employeeId: emp1.id,
    status: AttendanceStatus.PRESENT,
    checkIn: new Date(),
    notes: 'On time for morning shift',
  });

  if (att1.status !== AttendanceStatus.PRESENT) {
    throw new Error('Failed to record initial attendance');
  }

  // Update attendance on the same day (e.g. adjust to LATE with note)
  const att1Updated = await recordAttendance(bizA.id, userA.id, {
    employeeId: emp1.id,
    status: AttendanceStatus.LATE,
    notes: 'Corrected: arrived 20 mins late',
  });

  if (att1Updated.id !== att1.id || att1Updated.status !== AttendanceStatus.LATE) {
    throw new Error('Same-day attendance was not upserted into existing record!');
  }

  // Record attendance for archived employee (marked ABSENT)
  await recordAttendance(bizA.id, userA.id, {
    employeeId: emp2.id,
    status: AttendanceStatus.ABSENT,
  });

  const dailyAtt = await getDailyAttendance(bizA.id);
  if (dailyAtt.summary.presentCount !== 1 || dailyAtt.summary.totalEmployees !== 1) { // emp2 is inactive so total active is 1
    throw new Error(`Daily attendance summary mismatch: ${JSON.stringify(dailyAtt.summary)}`);
  }
  console.log('✓ Test 3 Passed: Attendance recorded and same-day upsert enforced 1 record per employee per day.');

  // --- TEST 4: Leave Requests, Approval Workflow & Notifications ---
  console.log('\n--- Running Test 4: Leave Requests, Approval Workflow & Notifications ---');
  const leave = await createLeaveRequest(bizA.id, userA.id, {
    employeeId: emp1.id,
    leaveType: LeaveType.CASUAL,
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 3 days
    reason: 'Family wedding event in Islamabad',
  });

  if (leave.status !== LeaveStatus.PENDING || leave.daysCount !== 3) {
    throw new Error(`Expected PENDING leave with 3 days, got ${leave.daysCount} days, status ${leave.status}`);
  }

  // Manager Approves Leave
  const reviewedLeave = await reviewLeaveRequest(
    bizA.id,
    userA.id,
    leave.id,
    'APPROVED',
    'Approved. Safe travels.'
  );

  if (reviewedLeave.status !== LeaveStatus.APPROVED || reviewedLeave.approvalNotes !== 'Approved. Safe travels.') {
    throw new Error('Leave approval workflow failed');
  }
  console.log('✓ Test 4 Passed: Leave request, duration calculation, and approval workflow verified.');

  // --- TEST 5: Exact Decimal Salary Calculation & Payment ---
  console.log('\n--- Running Test 5: Exact Decimal Salary Calculation & Payment ---');
  // Base = 40000, Overtime = 2500, Bonus = 5000, Deductions = 1500, Advance = 3000 -> Net = 43000
  const salary = await createSalaryRecord(bizA.id, userA.id, {
    employeeId: emp1.id,
    period: '2026-08',
    baseSalary: 40000,
    overtime: 2500,
    bonus: 5000,
    deductions: 1500,
    advance: 3000,
    notes: 'August 2026 payroll',
  });

  if (Number(salary.netSalary) !== 43000) {
    throw new Error(`Expected net salary 43000 (40000 + 2500 + 5000 - 1500 - 3000), got ${salary.netSalary}`);
  }

  // Disburse Salary Payment
  const paidSalary = await recordSalaryPayment(
    bizA.id,
    userA.id,
    salary.id,
    PaymentMethod.BANK_TRANSFER,
    'Transferred via Meezan Bank online'
  );

  if (paidSalary.paymentStatus !== 'PAID' || paidSalary.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
    throw new Error('Salary payment disbursement update failed');
  }
  console.log('✓ Test 5 Passed: Exact Decimal salary calculation (Base + OT + Bonus - Deductions - Advance) and disbursement verified.');

  // --- TEST 6: Complaints & Strict Privacy Filtering ---
  console.log('\n--- Running Test 6: Complaints Submission, Resolution & Privacy ---');
  const complaint = await createComplaint(bizA.id, userA.id, {
    employeeId: emp1.id,
    title: 'POS Barcode Scanner Malfunction',
    category: 'SAFETY',
    description: 'The laser trigger is sticking and slowing down checkout queues.',
    priority: ComplaintPriority.HIGH,
  });

  if (complaint.status !== ComplaintStatus.OPEN || complaint.priority !== ComplaintPriority.HIGH) {
    throw new Error('Complaint submission failed');
  }

  // Resolve Complaint
  const resolvedComplaint = await resolveComplaint(
    bizA.id,
    userA.id,
    complaint.id,
    'RESOLVED',
    'Replaced USB scanner cable and cleaned optical lens.'
  );

  if (resolvedComplaint.status !== ComplaintStatus.RESOLVED) {
    throw new Error('Complaint resolution failed');
  }

  // Test Privacy: Ordinary employee without matching userId cannot see other employees' complaints
  const empComplaints = await listComplaints(bizA.id, 'EMPLOYEE', staffUser.id);
  if (empComplaints.complaints.length !== 0) {
    throw new Error('Privacy breach! Ordinary employee saw unauthorized complaints.');
  }

  const managerComplaints = await listComplaints(bizA.id, 'MANAGER', userA.id);
  if (managerComplaints.complaints.length !== 1) {
    throw new Error('Manager failed to list store complaints.');
  }
  console.log('✓ Test 6 Passed: Complaint creation, resolution, and role-based privacy filtering verified.');

  // --- TEST 7: Tenant Isolation ---
  console.log('\n--- Running Test 7: Multi-Tenant Security & Isolation ---');
  const bizBEmployees = await listEmployees(bizB.id);
  if (bizBEmployees.employees.length !== 0) {
    throw new Error('Tenant leak! Business B saw Business A employees.');
  }

  let crossAccessFailed = false;
  try {
    await getEmployeeById(bizB.id, emp1.id);
  } catch {
    crossAccessFailed = true;
  }
  if (!crossAccessFailed) {
    throw new Error('Cross-business employee access was NOT rejected!');
  }
  console.log('✓ Test 7 Passed: Multi-tenant security verified. Business B cannot access Business A staff.');

  console.log('\n🎉 ALL STEP 10 EMPLOYEE & STAFF MANAGEMENT TESTS PASSED SUCCESSFULLY!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
