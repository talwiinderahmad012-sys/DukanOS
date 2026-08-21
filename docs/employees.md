# DukaanOS — Employee & Staff Management Module (Step 10)

## Overview
The **Employee & Staff Management Module** enables retail store owners and managers to maintain official staff records, track daily attendance, review leave requests, generate exact monthly payroll records, disburse salaries, and handle workplace feedback/complaints with strict role-based privacy.

---

## 1. Core Architecture Decisions

### User vs. Employee Separation
- An `Employee` is a business-specific staff record (e.g. cashiers, helpers, storekeepers).
- An employee does NOT require a login account by default.
- If system access is granted, an `Employee` can be linked to a `User` and `BusinessMembership`.

### Employee Identification Code
- Unique per business: `@@unique([businessId, employeeCode])`.
- Auto-generated sequentially (`EMP-001`, `EMP-002`, etc.) if not provided manually.

### Attendance System
- Enforces strictly **1 attendance record per employee per business calendar day** via `@@unique([businessId, employeeId, date])` where date is normalized to UTC midnight.
- Statuses: `PRESENT`, `ABSENT`, `LATE`, `LEAVE`.
- Captures `checkIn`, `checkOut`, and operational notes.

### Leave Management Workflow
- Staff submits leave request: `CASUAL`, `SICK`, `ANNUAL`, `UNPAID`, `OTHER`.
- Default status: `PENDING`.
- Notification dispatched to store owners/managers.
- Authorized managers review with `APPROVED` or `REJECTED` and optional manager notes.

### Salary & Historical Payroll
- `Employee.basicSalary` stores current base pay configuration.
- `EmployeeSalary` stores immutable monthly snapshot:
  $$\text{Net Salary} = \text{Base Salary} + \text{Overtime} + \text{Bonus} - \text{Deductions} - \text{Advance}$$
- Payment disbursement recorded with `paymentStatus: 'PAID'`, `paymentMethod` (Cash, Bank Transfer, Mobile Wallet, Card), and audit log.

### Workplace Feedback & Complaints
- Staff can submit confidential issues with priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- High/Urgent complaints trigger immediate notifications to store owners.
- Strict Privacy: Ordinary staff can only view complaints they authored. Managers/Owners can review and mark `RESOLVED`, `IN_REVIEW`, or `REJECTED` with an action note.

---

## 2. Domain Services & APIs

| Service | File | Primary Methods |
| :--- | :--- | :--- |
| **Employees** | `src/services/employees.ts` | `createEmployee`, `updateEmployee`, `archiveEmployee`, `getEmployeeById`, `listEmployees`, `getEmployeeDashboardStats` |
| **Attendance** | `src/services/attendance.ts` | `recordAttendance`, `getDailyAttendance`, `getMonthlyAttendanceSummary` |
| **Leaves** | `src/services/leave.ts` | `createLeaveRequest`, `reviewLeaveRequest`, `listEmployeeLeaves` |
| **Salaries** | `src/services/salaries.ts` | `createSalaryRecord`, `recordSalaryPayment`, `getEmployeeSalaryHistory` |
| **Complaints** | `src/services/complaints.ts` | `createComplaint`, `resolveComplaint`, `listComplaints` |

---

## 3. UI Routes & Components

- `/dashboard/employees`: Directory with KPI summary cards (Total Staff, Present Today, Absent, Pending Leaves, Open Complaints), search/status filters, and staff list.
- `/dashboard/employees/new`: Employee onboarding form.
- `/dashboard/employees/[id]`: Employee Profile Hub with 6 interactive tabs:
  1. **Overview**: Key stats, attendance rate %, contact info, branch assignment, edit trigger.
  2. **Attendance**: 30-day log and "+ Mark Log" modal.
  3. **Leave**: Request history and manager review modal.
  4. **Salary History**: Monthly payroll table, net salary formula breakdown, and "Pay Now" modal.
  5. **Complaints**: Confidential grievance log and resolution modal.
  6. **Activity & Audit**: Full chronological audit trail.
