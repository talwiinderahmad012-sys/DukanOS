import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { redirect } from 'next/navigation';
import { PayrollView } from './payroll-view';
import type { PayrollListItem } from './payroll-list';

export default async function PayrollPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  if (membership.role !== 'OWNER') redirect('/dashboard');

  const payrolls = await prisma.payroll.findMany({
    where: { businessId: business.id },
    include: {
      _count: {
        select: { employeeSalary: true }
      }
    },
    orderBy: { startDate: 'desc' }
  });

  const rows: PayrollListItem[] = payrolls.map((payroll) => ({
    id: payroll.id,
    periodName: payroll.periodName,
    status: payroll.status,
    startDate: payroll.startDate.toISOString(),
    endDate: payroll.endDate.toISOString(),
    createdBy: payroll.createdBy,
    salaryCount: payroll._count.employeeSalary,
  }));

  return <PayrollView payrolls={rows} />;
}
