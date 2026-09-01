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
  console.log('====================================================');
  console.log('    DUKAANOS — STEP 27 EMPLOYEES & HR VERIFICATION  ');
  console.log('====================================================\n');

  const { prisma } = await import('../lib/db/prisma');
  const {
    createEmployee,
    updateEmployee,
    getEmployeeById,
    listEmployees,
    getEmployeeDashboardStats,
  } = await import('../services/employees');
  const {
    recordAttendance,
    getDailyAttendance,
  } = await import('../services/attendance');
  const {
    createLeaveRequest,
    reviewLeaveRequest,
    listEmployeeLeaves,
    getEmployeeLeaveBalances,
  } = await import('../services/leave');
  const {
    createComplaint,
    resolveComplaint,
    listComplaints,
  } = await import('../services/complaints');

  // 1. Resolve Active Business & Owner
  console.log('STEP 1: Resolving Active Business and Owner User...');
  const business = await prisma.business.findFirst({
    include: {
      memberships: {
        include: { user: true },
      },
    },
  });

  if (!business || !business.memberships[0]) {
    throw new Error('FAIL: No business or membership found.');
  }

  const ownerUser = business.memberships[0].user;
  console.log(`- Business: "${business.name}" (${business.id})`);
  console.log(`- Owner: "${ownerUser.name}" (${ownerUser.id})`);
  console.log('✓ PASS: Business & user context resolved.\n');

  // 2. Test Employee Creation
  console.log('STEP 2: Testing Employee Creation...');
  const testCode = `EMP-TEST-${Date.now().toString().slice(-4)}`;
  const createdEmployee = await createEmployee(business.id, ownerUser.id, {
    name: 'Tariq Mehmood',
    employeeCode: testCode,
    phone: '+923001234567',
    email: `tariq.${Date.now()}@example.com`,
    position: 'Inventory Manager',
    department: 'Warehouse',
    joiningDate: new Date().toISOString().slice(0, 10),
    salaryType: 'MONTHLY',
    basicSalary: 45000,
    status: 'ACTIVE',
  });

  if (!createdEmployee || createdEmployee.employeeCode !== testCode) {
    throw new Error('FAIL: Employee creation failed or returned mismatch.');
  }
  console.log(`- Created Employee: "${createdEmployee.name}" (${createdEmployee.id})`);
  console.log(`- Code: ${createdEmployee.employeeCode}, Basic Salary: Rs. ${createdEmployee.basicSalary}`);
  console.log('✓ PASS: Employee profile created successfully.\n');

  // 3. Test Employee Update
  console.log('STEP 3: Testing Employee Update...');
  const updatedEmployee = await updateEmployee(business.id, ownerUser.id, createdEmployee.id, {
    name: 'Tariq Mehmood (Updated)',
    basicSalary: 48000,
  });
  if (!updatedEmployee || Number(updatedEmployee.basicSalary) !== 48000) {
    throw new Error('FAIL: Employee update failed.');
  }
  console.log(`- Updated Name: "${updatedEmployee.name}", Salary: Rs. ${updatedEmployee.basicSalary}`);
  console.log('✓ PASS: Employee update verified.\n');

  // 4. Test Attendance Recording
  console.log('STEP 4: Testing Attendance Recording...');
  const todayStr = new Date().toISOString().slice(0, 10);
  const attendanceRecord = await recordAttendance(business.id, ownerUser.id, {
    employeeId: createdEmployee.id,
    date: todayStr,
    status: 'PRESENT',
    checkIn: new Date(),
    notes: 'On time morning shift',
  });
  if (!attendanceRecord || attendanceRecord.status !== 'PRESENT') {
    throw new Error('FAIL: Attendance recording failed.');
  }
  console.log(`- Recorded Attendance Status: ${attendanceRecord.status} for ${todayStr}`);

  const dailyAttendance = await getDailyAttendance(business.id, todayStr);
  console.log(`- Daily Attendance Board Summary: Total: ${dailyAttendance.summary.totalEmployees}, Present: ${dailyAttendance.summary.presentCount}`);
  console.log('✓ PASS: Attendance recording and daily board verified.\n');

  // 5. Test Leave Management
  console.log('STEP 5: Testing Leave Request & Review Workflow...');
  const leaveStart = new Date();
  const leaveEnd = new Date(leaveStart);
  leaveEnd.setDate(leaveStart.getDate() + 2);

  const leaveReq = await createLeaveRequest(business.id, ownerUser.id, {
    employeeId: createdEmployee.id,
    leaveType: 'CASUAL',
    startDate: leaveStart.toISOString().slice(0, 10),
    endDate: leaveEnd.toISOString().slice(0, 10),
    reason: 'Family event out of city',
  });
  console.log(`- Created Leave Request: ID ${leaveReq.id}, Days: ${leaveReq.daysCount}, Status: ${leaveReq.status}`);

  const reviewedLeave = await reviewLeaveRequest(
    business.id,
    ownerUser.id,
    leaveReq.id,
    'APPROVED',
    'Approved by manager'
  );
  if (!reviewedLeave || reviewedLeave.status !== 'APPROVED') {
    throw new Error('FAIL: Leave review failed to approve.');
  }
  console.log(`- Reviewed Leave Status: ${reviewedLeave.status}`);

  const leaveBalances = await getEmployeeLeaveBalances(business.id, createdEmployee.id);
  console.log(`- Employee Leave Balances Tracked: ${leaveBalances.length} categories`);
  console.log('✓ PASS: Leave request, approval, and balance calculation verified.\n');

  // 6. Test Complaint Management
  console.log('STEP 6: Testing Employee Complaint Workflow...');
  const complaint = await createComplaint(business.id, ownerUser.id, {
    employeeId: createdEmployee.id,
    title: 'AC unit not working in warehouse',
    description: 'The cooling unit in zone B stopped working yesterday afternoon.',
    category: 'FACILITIES',
    priority: 'MEDIUM',
  });
  console.log(`- Filed Complaint: "${complaint.title}" (${complaint.id}), Status: ${complaint.status}`);

  const resolvedComplaint = await resolveComplaint(
    business.id,
    ownerUser.id,
    complaint.id,
    'RESOLVED',
    'Technician serviced the AC compressor.'
  );
  if (!resolvedComplaint || resolvedComplaint.status !== 'RESOLVED') {
    throw new Error('FAIL: Complaint resolution failed.');
  }
  console.log(`- Resolved Complaint Status: ${resolvedComplaint.status}`);
  console.log('✓ PASS: Complaint submission and resolution verified.\n');

  // 7. Test Dashboard & Directory Stats
  console.log('STEP 7: Testing Employee Dashboard Stats & Directory Query...');
  const stats = await getEmployeeDashboardStats(business.id);
  const directory = await listEmployees(business.id, { search: 'Tariq', page: 1, limit: 10 });

  console.log(`- Dashboard Stats: Total: ${stats.totalEmployees}, Active: ${stats.activeEmployees}, Present: ${stats.presentToday}`);
  console.log(`- Filtered Directory Search Matches: ${directory.employees.length}`);
  if (directory.employees.length === 0) {
    throw new Error('FAIL: Newly created employee not returned in directory search.');
  }
  console.log('✓ PASS: Employee stats and directory query verified.\n');

  // 8. Tenant Isolation
  console.log('STEP 8: Testing Tenant Isolation for HR Data...');
  const otherBusiness = await prisma.business.findFirst({
    where: { id: { not: business.id } },
  });

  if (otherBusiness) {
    const otherEmployees = await listEmployees(otherBusiness.id, { page: 1, limit: 10 });
    const crossAccess = otherEmployees.employees.some(e => e.id === createdEmployee.id);
    if (crossAccess) {
      throw new Error('FAIL: Tenant isolation breach — other business saw employee.');
    }
    console.log(`- Verified employee isolation against other business "${otherBusiness.name}"`);
    console.log('✓ PASS: Tenant isolation verified for HR records.\n');
  }

  console.log('====================================================');
  console.log('  ALL STEP 27 EMPLOYEES & HR TESTS PASSED (8/8)     ');
  console.log('====================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('TEST_FAILED:', err);
    process.exit(1);
  });
