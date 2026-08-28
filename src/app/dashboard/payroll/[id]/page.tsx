import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { PayrollDetailView } from './payroll-detail-view';

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const payroll = await prisma.payroll.findUnique({
    where: { id, businessId: business.id },
    include: {
      employeeSalary: {
        include: {
          employee: { select: { id: true, name: true, employeeCode: true, position: true } }
        }
      }
    }
  });

  if (!payroll) redirect('/dashboard/payroll');

  return (
    <PayrollDetailView
      businessId={business.id}
      payroll={{
        id: payroll.id,
        periodName: payroll.periodName,
        status: payroll.status,
        startDate: payroll.startDate.toISOString(),
        endDate: payroll.endDate.toISOString(),
        salaries: payroll.employeeSalary.map((salary) => ({
          id: salary.id,
          employeeName: salary.employee.name,
          employeeCode: salary.employee.employeeCode,
          position: salary.employee.position,
          baseSalary: Number(salary.baseSalary),
          netSalary: Number(salary.netSalary),
          paymentStatus: salary.paymentStatus,
        })),
      }}
    />
  );
}
