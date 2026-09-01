import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import {
  getAnalyticsKPIs,
  getSalesTrend,
  getSalesByPaymentMethod,
  getSalesByCategory,
  getTopProducts,
} from '@/services/analytics';
import { type DateRangePreset } from '@/components/analytics/date-range-filter';
import { SalesAnalyticsClient } from './sales-analytics-client';

export default async function SalesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = (params.preset || 'thisMonth') as DateRangePreset;
  const tz = business.timezone || 'Asia/Karachi';

  let startDate = new Date();
  let endDate = new Date();
  let periodKey = 'thisMonth';

  if (preset === 'custom' && params.start && params.end) {
    startDate = new Date(params.start);
    endDate = new Date(params.end);
    endDate.setHours(23, 59, 59, 999);
    periodKey = 'custom';
  } else {
    const now = new Date();
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodKey = 'today';
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        periodKey = 'yesterday';
        break;
      case 'thisWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        periodKey = 'thisWeek';
        break;
      }
      case 'lastWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
        startDate = new Date(thisWeekStart);
        startDate.setDate(thisWeekStart.getDate() - 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        periodKey = 'lastWeek';
        break;
      }
      case 'lastMonth': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        periodKey = 'lastMonth';
        break;
      }
      case 'thisQuarter': {
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), qStart, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), qStart + 3, 0, 23, 59, 59, 999);
        periodKey = 'thisQuarter';
        break;
      }
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodKey = 'thisYear';
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        periodKey = 'lastYear';
        break;
    }
  }

  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  const diffMs = endDate.getTime() - startDate.getTime();
  prevStart.setTime(prevStart.getTime() - diffMs);
  prevEnd.setTime(prevEnd.getTime() - diffMs);

  const period = { start: startDate, end: endDate, label: periodKey };
  const comparisonPeriod = { start: prevStart, end: prevEnd, label: 'Previous Period' };

  const [kpis, trend, paymentMethods, categories] = await Promise.all([
    getAnalyticsKPIs(business.id, period, comparisonPeriod),
    getSalesTrend(business.id, Math.ceil(diffMs / (1000 * 60 * 60 * 24)), tz),
    getSalesByPaymentMethod(business.id, startDate, endDate),
    getSalesByCategory(business.id, startDate, endDate),
  ]);

  const topProducts = await getTopProducts(business.id, startDate, endDate, 10, 'revenue');

  const exportData = [
    ...trend.map(d => ({ Date: d.date, Revenue: d.revenue, Profit: d.profit, Orders: d.orders })),
    ...paymentMethods.map(p => ({ PaymentMethod: p.method, Count: p.count, Revenue: p.revenue, Percentage: `${p.percentage}%` })),
    ...categories.map(c => ({ Category: c.categoryName, Revenue: c.revenue, Profit: c.profit, Orders: c.orders, Percentage: `${c.percentage}%` })),
  ];

  return (
    <SalesAnalyticsClient
      preset={preset}
      startISO={startDate.toISOString()}
      endISO={endDate.toISOString()}
      periodKey={periodKey}
      exportData={exportData}
      kpis={kpis}
      paymentMethods={paymentMethods}
      categories={categories}
      topProducts={topProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        profit: p.profit,
        profitMarginPercent: p.profitMarginPercent,
      }))}
    />
  );
}
