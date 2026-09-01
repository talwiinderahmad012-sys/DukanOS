import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { getPurchaseAnalytics } from '@/services/analytics';
import { PurchasesAnalyticsClient } from './purchases-analytics-client';

export default async function PurchasesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let periodKey = 'thisMonth';

  if (preset === 'lastMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    periodKey = 'lastMonth';
  } else if (preset === 'thisYear') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    periodKey = 'thisYear';
  }

  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  const diffMs = endDate.getTime() - startDate.getTime();
  prevStart.setTime(prevStart.getTime() - diffMs);
  prevEnd.setTime(prevEnd.getTime() - diffMs);
  const period = { start: startDate, end: endDate, label: periodKey };
  const comparisonPeriod = { start: prevStart, end: prevEnd, label: 'Previous' };

  const purchaseAnalytics = await getPurchaseAnalytics(business.id, period, comparisonPeriod);

  return (
    <PurchasesAnalyticsClient
      periodKey={periodKey}
      data={{
        totalSpend: purchaseAnalytics.totalSpend,
        orderCount: purchaseAnalytics.orderCount,
        topSuppliers: purchaseAnalytics.topSuppliers.map(s => ({
          supplierId: s.supplierId,
          name: s.name,
          totalSpend: s.totalSpend,
          purchaseCount: s.purchaseCount,
          lastPurchaseDate: s.lastPurchaseDate ? s.lastPurchaseDate.toISOString() : null,
        })),
      }}
    />
  );
}
