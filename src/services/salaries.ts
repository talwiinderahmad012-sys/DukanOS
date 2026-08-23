import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { SalaryPaymentStatus, PaymentMethod } from '@/generated/prisma/client';
import { recordAuditLog } from './audit';

export async function createSalaryRecord(
  businessId: string,
  recordedBy: string,
  data: {
    employeeId: string;
    period: string; // "YYYY-MM"
    baseSalary: number;
    overtime?: number;
    bonus?: number;
    deductions?: number;
    advance?: number;
    notes?: string | null;
  }
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, businessId },
  });

  if (!employee) {
    throw new Error('Employee not found or unauthorized.');
  }

  // Immutability: never silently modify paid salary records or records that
  // belong to a finalized/paid payroll. Financial history stays intact.
  const existingRecord = await prisma.employeeSalary.findUnique({
    where: {
      businessId_employeeId_period: {
        businessId,
        employeeId: data.employeeId,
        period: data.period,
      },
    },
    include: { payroll: { select: { status: true } } },
  });

  if (existingRecord) {
    if (existingRecord.paymentStatus === SalaryPaymentStatus.PAID) {
      throw new Error(
        'This salary record has already been paid and cannot be modified. Record an adjustment instead.'
      );
    }
    if (
      existingRecord.payroll &&
      (existingRecord.payroll.status === 'FINALIZED' || existingRecord.payroll.status === 'PAID')
    ) {
      throw new Error(
        `This salary record belongs to a ${existingRecord.payroll.status.toLowerCase()} payroll and is immutable.`
      );
    }
  }

  const baseSalary = Number(data.baseSalary) || 0;
  const overtime = Number(data.overtime) || 0;
  const bonus = Number(data.bonus) || 0;
  const deductions = Number(data.deductions) || 0;
  const advance = Number(data.advance) || 0;

  // Deterministic Net Salary Formula (never negative)
  const netSalary = Math.max(0, baseSalary + overtime + bonus - deductions - advance);

  const salary = await prisma.employeeSalary.upsert({
    where: {
      businessId_employeeId_period: {
        businessId,
        employeeId: data.employeeId,
        period: data.period,
      },
    },
    update: {
      baseSalary,
      overtime,
      bonus,
      deductions,
      advance,
      netSalary,
      notes: data.notes?.trim() || null,
      recordedBy,
    },
    create: {
      businessId,
      employeeId: data.employeeId,
      period: data.period,
      baseSalary,
      overtime,
      bonus,
      deductions,
      advance,
      netSalary,
      paymentStatus: SalaryPaymentStatus.PENDING,
      notes: data.notes?.trim() || null,
      recordedBy,
    },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
  });

  await recordAuditLog({
    businessId,
    userId: recordedBy,
    action: 'SALARY_RECORD_CREATED',
    entityType: 'EmployeeSalary',
    entityId: salary.id,
    metadata: {
      employeeId: employee.id,
      employeeName: employee.name,
      period: salary.period,
      netSalary,
    },
  });

  return salary;
}

export async function recordSalaryPayment(
  businessId: string,
  recordedBy: string,
  salaryId: string,
  paymentMethod: PaymentMethod = PaymentMethod.CASH,
  notes?: string | null
) {
  const salary = await prisma.employeeSalary.findFirst({
    where: { id: salaryId, businessId },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
  });

  if (!salary) {
    throw new Error('Salary record not found or unauthorized.');
  }

  const updated = await prisma.employeeSalary.update({
    where: { id: salaryId },
    data: {
      paymentStatus: SalaryPaymentStatus.PAID,
      paymentDate: new Date(),
      paymentMethod,
      notes: notes ? `${salary.notes ? `${salary.notes} | ` : ''}${notes.trim()}` : salary.notes,
    },
  });

  await recordAuditLog({
    businessId,
    userId: recordedBy,
    action: 'SALARY_PAID',
    entityType: 'EmployeeSalary',
    entityId: salary.id,
    metadata: {
      employeeId: salary.employee.id,
      employeeName: salary.employee.name,
      period: salary.period,
      netSalary: Number(salary.netSalary),
      paymentMethod,
    },
  });

  return updated;
}

export async function getEmployeeSalaryHistory(businessId: string, employeeId: string) {
  return prisma.employeeSalary.findMany({
    where: { businessId, employeeId },
    orderBy: { period: 'desc' },
  });
}

