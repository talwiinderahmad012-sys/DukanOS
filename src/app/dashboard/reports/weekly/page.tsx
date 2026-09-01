import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getWeeklyReport } from '@/services/reports';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import {
  WeeklyReportClient,
  type BranchOption,
  type GrowthData,
  type WeeklyDayRow,
} from './weekly-report-client';

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branchId?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (!canAccessDashboardPath(membership.role, '/dashboard/reports/weekly')) {
    return <ForbiddenView role={membership.role} />;
  }
  const params = await searchParams;
  const dateInput = params.date;
  const branchId = params.branchId;

  const [report, branches] = await Promise.all([
    getWeeklyReport(business.id, dateInput, business.timezone, branchId || undefined),
    prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
  ]);
  const { summary, growth, dayBreakdown, weekStart, weekEnd } = report;

  const days: WeeklyDayRow[] = dayBreakdown.map((d) => ({
    dateStr: d.dateStr,
    revenue: d.revenue,
    grossProfit: d.grossProfit,
    expenses: d.expenses,
    netProfit: d.netProfit,
    orders: d.orders,
  }));

  const growthData: GrowthData = {
    status: growth.revenueGrowth.status,
    formatted: growth.revenueGrowth.formatted,
  };

  const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <WeeklyReportClient
      weekStart={weekStart.toISOString().slice(0, 10)}
      weekEnd={weekEnd.toISOString().slice(0, 10)}
      branchId={branchId}
      branches={branchOptions}
      summary={{
        grossRevenue: summary.grossRevenue,
        grossProfit: summary.grossProfit,
        expenses: summary.expenses,
        netProfit: summary.netProfit,
        ordersCount: summary.ordersCount,
      }}
      growth={growthData}
      days={days}
    />
  );
}
