import { requireActiveBusiness } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import {
  getTopProducts,
  getSlowMovingProducts,
  getBestProfitProducts,
  getDecliningProducts,
} from '@/services/analytics';
import { ProductsAnalyticsClient } from './products-analytics-client';

export default async function ProductsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const { business, membership } = await requireActiveBusiness();
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let periodKey = 'thisMonth';

  if (preset === 'custom' && params.start && params.end) {
    startDate = new Date(params.start);
    endDate = new Date(params.end);
    endDate.setHours(23, 59, 59, 999);
    periodKey = 'custom';
  } else {
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodKey = 'today';
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
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        periodKey = 'lastMonth';
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodKey = 'thisYear';
        break;
    }
  }

  const [topProducts, bestProfit, slowMoving, declining] = await Promise.all([
    getTopProducts(business.id, startDate, endDate, 15, 'units'),
    getBestProfitProducts(business.id, startDate, endDate, 15),
    getSlowMovingProducts(business.id, 30, 15),
    getDecliningProducts(business.id, { start: startDate, end: endDate, label: periodKey }, { start: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), end: new Date(startDate.getTime() - 1), label: 'Previous' }),
  ]);

  return (
    <ProductsAnalyticsClient
      periodKey={periodKey}
      topProducts={topProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        unit: p.unit,
        quantitySold: p.quantitySold,
        revenue: p.revenue,
        profitMarginPercent: p.profitMarginPercent,
      }))}
      bestProfit={bestProfit.map(p => ({
        productId: p.productId,
        name: p.name,
        revenue: p.revenue,
        profit: p.profit,
        profitMarginPercent: p.profitMarginPercent,
      }))}
      slowMoving={slowMoving.map(p => ({
        productId: p.productId,
        name: p.name,
        currentStock: p.currentStock,
        stockValue: p.stockValue,
        daysSinceLastSale: p.daysSinceLastSale,
      }))}
      declining={declining.map(p => ({
        productId: p.productId,
        name: p.name,
        previousRevenue: p.previousRevenue,
        currentRevenue: p.currentRevenue,
        declinePercent: p.declinePercent,
      }))}
    />
  );
}
