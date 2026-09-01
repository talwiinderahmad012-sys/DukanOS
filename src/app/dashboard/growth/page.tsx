import { requireActiveBusiness } from '@/lib/auth/guards';
import { getBusinessGrowth, getMonthlyReport } from '@/services/reports';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { GrowthPageClient, type GrowthPeriodParam } from './growth-client';

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (!canAccessDashboardPath(membership.role, '/dashboard/growth')) {
    return <ForbiddenView role={membership.role} />;
  }
  const params = await searchParams;

  const periodParam = (params.period || 'MONTHLY').toUpperCase() as GrowthPeriodParam;
  const growth = await getBusinessGrowth(business.id, periodParam, business.timezone);
  const monthlyData = await getMonthlyReport(business.id, undefined, undefined, business.timezone);

  return (
    <GrowthPageClient
      periodParam={periodParam}
      revenue={{
        current: growth.currentRevenue,
        previous: growth.revenueGrowth.previous,
        percentage: growth.revenueGrowth.percentage,
        status: growth.revenueGrowth.status,
      }}
      grossProfit={{
        current: growth.currentProfit,
        previous: growth.profitGrowth.previous,
        percentage: growth.profitGrowth.percentage,
        status: growth.profitGrowth.status,
      }}
      netProfit={{
        current: growth.netProfitGrowth.current,
        previous: growth.netProfitGrowth.previous,
        percentage: growth.netProfitGrowth.percentage,
        status: growth.netProfitGrowth.status,
      }}
      orders={{
        current: growth.currentOrders,
        previous: growth.ordersGrowth.previous,
        percentage: growth.ordersGrowth.percentage,
        status: growth.ordersGrowth.status,
      }}
      chartData={monthlyData.dailyData.slice(0, 15).map((d) => ({
        day: d.day,
        revenue: d.revenue,
        profit: d.profit,
      }))}
    />
  );
}
