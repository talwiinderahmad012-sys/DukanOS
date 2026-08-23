# DukaanOS â€” Employee & Staff Management Module (Step 10)

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

---

# Step 30 — Advanced Employee Management (Hardening)

Step 30 extends (never rebuilds) the Step 10 foundation with leave balances, self-service,
check-in/check-out, Decimal-safe payroll, and stronger privacy/audit guarantees.

## Employee Roles & Permission Matrix

| Capability | OWNER | MANAGER | CASHIER | EMPLOYEE |
| :--- | :--: | :--: | :--: | :--: |
| Create / update / deactivate employees | Y | Y | N | N |
| Assign branch, change salary structure | Y | Y | N | N |
| View any employee profile | Y | Y | Y (directory) | own only |
| View salary/payroll data of others | Y | Y | N | N |
| Approve / reject leave | Y | Y | N | N (never own) |
| Generate / finalize / pay / cancel payroll | Y | Y | N | N |
| Self check-in / check-out | Y | Y | Y | Y |
| Cancel own pending leave | Y | Y | Y | Y |
| Employee self-service workspace (`/dashboard/me`) | Y | Y | Y | Y |

## Attendance Workflow

- `recordAttendance` upserts one record per employee per day. Creating is audited as
  `ATTENDANCE_RECORDED`; correcting an existing record is audited as
  `ATTENDANCE_MANUAL_OVERRIDE` with the previous status in metadata.
- `checkInEmployee` / `checkOutEmployee` provide self-service punches. Duplicate
  check-ins/check-outs are rejected; check-out requires an earlier check-in and cannot
  precede it.
- Late marking is rule-based and configurable via `ATTENDANCE_LATE_RULE`
  (default: 09:00 start, 15-minute grace). Late arrivals are stored with status `LATE`.
- Days marked `LEAVE`/`OFF_DAY` reject check-ins.

## Leave Workflow

1. Employee (or manager) applies: `PENDING`.
2. OWNER/MANAGER reviews. **Self-approval is blocked** (a user can never review a leave
   request linked to their own employee record). `reviewedAt` and `approvedBy` are stamped.
3. On APPROVED, inside one transaction: the yearly `LeaveBalance.used` is incremented
   atomically (insufficient balance aborts the whole approval - no negative balances), and
   `LEAVE` attendance markers are created for each day (existing punched days are never
   overwritten).
4. Cancelling an APPROVED leave reverses the balance and removes untouched `LEAVE`
   markers in the same transaction. Employees may only cancel their own PENDING requests;
   privileged roles may cancel any active request.
5. `UNPAID` leave never consumes balances.
6. Whole-day leaves only - `daysCount` is integer-validated.

## Payroll Lifecycle & Salary Immutability

```
DRAFT --generate--> (items) --finalize--> FINALIZED --markPaid--> PAID
   \---cancel---> CANCELLED            \---cancel---> CANCELLED
```

- Generation is deterministic and uses **Prisma Decimal arithmetic only**:
  `dailyRate = base / workingDays`, `deduction = dailyRate x (absent + halfDays x 0.5 + approvedUnpaidLeaveDays)`,
  `netPay = base - deduction` (floored at zero, 2-dp rounding).
- Base salary, allowances, deductions and attendance/leave impact are **snapshotted** per
  `EmployeeSalary` row. Later salary changes never alter generated payroll; salary changes
  are written to `EmployeeSalaryHistory` and audited without exposing amounts.
- FINALIZED/PAID payrolls are immutable: regeneration, salary edits, and payment recording
  are blocked by `assertPayrollMutable` and guards in `salaries.ts`.
- `markPayrollPaid` settles the payroll and all pending salary items in one transaction.
- `cancelPayroll` is controlled and audited; PAID payrolls can never be cancelled and
  history is never deleted.

## Notification Behavior

- Internal notifications (existing `Notification` model) are generated for: leave request,
  leave decision, payroll generated, payroll finalized, salary paid, and manual employee
  alerts (`notifyEmployee`).
- Employee notifications are scoped by `recipientId`; `getEmployeeNotifications` returns
  only the caller's own notifications.
- All notification failures are caught and logged - they never break attendance, leave,
  or payroll operations. Employees without a linked user account are silent no-ops.

## Audit Behavior

Audited actions include: `EMPLOYEE_CREATED/UPDATED/ARCHIVED/DEACTIVATED*`,
`EMPLOYEE_BRANCH_ASSIGNED`, `EMPLOYEE_SALARY_STRUCTURE_CHANGED`,
`ATTENDANCE_RECORDED/ATTENDANCE_MANUAL_OVERRIDE/EMPLOYEE_CHECKED_IN/EMPLOYEE_CHECKED_OUT`,
`LEAVE_REQUESTED/LEAVE_APPROVED/LEAVE_REJECTED/LEAVE_CANCELLED`,
`PAYROLL_CREATED/PAYROLL_GENERATED_SALARIES/PAYROLL_FINALIZED/PAYROLL_PAID/PAYROLL_CANCELLED`,
`SALARY_RECORD_CREATED/SALARY_PAID`. Salary-change audits intentionally omit exact amounts.

## Employee Self-Service

`/dashboard/me` shows the signed-in employee their own profile, today's attendance with
check-in/out buttons, month attendance list, leave balances, own leave requests, own salary
slips, and own notifications. Employees are redirected away from other employees' profile
pages. Pakistani phone numbers are normalized to `+92` format on write; other international
formats are left untouched.
