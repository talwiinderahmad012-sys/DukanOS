import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getAnalyticsKPIs,
  getSalesTrend,
  getSalesByPaymentMethod,
  getSalesByCategory,
  getCurrentMonthPeriods,
  getTopProducts,
} from '@/services/analytics';
import { type DateRangePreset } from '@/components/analytics/date-range-filter';
import { SalesAnalyticsFilter } from '@/components/analytics/sales-analytics-filter';
import { ExportButton } from '@/components/analytics/export-button';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, ShoppingCart, Receipt,
  ArrowUpRight, CreditCard, Tag,
  ArrowLeft
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

function GrowthBadge({ growth }: { growth: any }) {
  const { status, formatted } = growth;
  if (status === 'NO_BASELINE') return <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">New</span>;
  if (status === 'UP')   return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>{formatted}</span>;
  if (status === 'DOWN') return <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingDown className="w-3 h-3"/>{formatted}</span>;
  return <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Minus className="w-3 h-3"/>{formatted}</span>;
}

export default async function SalesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = (params.preset || 'thisMonth') as DateRangePreset;
  const tz = business.timezone || 'Asia/Karachi';

  let startDate = new Date();
  let endDate = new Date();
  let label = 'This Month';

  if (preset === 'custom' && params.start && params.end) {
    startDate = new Date(params.start);
    endDate = new Date(params.end);
    endDate.setHours(23, 59, 59, 999);
    label = 'Custom Range';
  } else {
    const now = new Date();
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = 'Today';
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        label = 'Yesterday';
        break;
      case 'thisWeek': {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        label = 'This Week';
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
        label = 'Last Week';
        break;
      }
      case 'lastMonth': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = 'Last Month';
        break;
      }
      case 'thisQuarter': {
        const qStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), qStart, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), qStart + 3, 0, 23, 59, 59, 999);
        label = 'This Quarter';
        break;
      }
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        label = 'This Year';
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        label = 'Last Year';
        break;
    }
  }

  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  const diffMs = endDate.getTime() - startDate.getTime();
  prevStart.setTime(prevStart.getTime() - diffMs);
  prevEnd.setTime(prevEnd.getTime() - diffMs);

  const period = { start: startDate, end: endDate, label };
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
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">{label} · Completed sales only</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SalesAnalyticsFilter
            preset={preset}
            startISO={startDate.toISOString()}
            endISO={endDate.toISOString()}
          />
          <ExportButton data={exportData} filename="sales-analytics" label="Export CSV" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Sales</p>
          <p className="text-xl font-bold text-gray-900">{fmt(kpis.totalSales.current)}</p>
          <GrowthBadge growth={kpis.totalSales.growth} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Gross Profit</p>
          <p className="text-xl font-bold text-emerald-700">{fmt(kpis.grossProfit.current)}</p>
          <GrowthBadge growth={kpis.grossProfit.growth} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Avg Order Value</p>
          <p className="text-xl font-bold text-gray-900">{fmt(kpis.avgOrderValue.current)}</p>
          <p className="text-[10px] text-gray-400">{fmtN(kpis.orderCount.current)} orders</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Net Profit</p>
          <p className="text-xl font-bold text-violet-700">{fmt(kpis.netProfit.current)}</p>
          <GrowthBadge growth={kpis.netProfit.growth} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Sales by Payment Method</h2>
          {paymentMethods.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No sales data for this period.</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <div key={pm.method} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-900">{pm.method}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{fmt(pm.revenue)}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{pm.count} orders · {pm.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Sales by Category</h2>
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No sales data for this period.</p>
          ) : (
            <div className="space-y-2">
              {categories.slice(0, 10).map(cat => (
                <div key={cat.categoryId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-900">{cat.categoryName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{fmt(cat.revenue)}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{cat.orders} orders · {cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Top Products by Revenue</h2>
        {topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No sales recorded this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">Product</th>
                  <th className="text-right py-2 px-2">Units Sold</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                  <th className="text-right py-2 px-2">Profit</th>
                  <th className="text-right py-2 px-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.sku && <p className="text-gray-400 font-mono text-[10px]">{p.sku}</p>}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">{fmtN(p.quantitySold)} {p.unit}</td>
                    <td className="py-2 px-2 text-right">{fmt(p.revenue)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700">{fmt(p.profit)}</td>
                    <td className="py-2 pl-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${p.profitMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-700' : p.profitMarginPercent >= 10 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.profitMarginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
