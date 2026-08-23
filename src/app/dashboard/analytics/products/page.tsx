import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getTopProducts,
  getSlowMovingProducts,
  getBestProfitProducts,
  getDecliningProducts,
  getLowStockSummary,
  getCurrentMonthPeriods,
} from '@/services/analytics';
import Link from 'next/link';
import {
  ArrowLeft, TrendingUp, AlertTriangle, Minus,
  Package, Tag, BarChart3
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

export default async function ProductsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role === 'EMPLOYEE') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let label = 'This Month';

  if (preset === 'custom' && params.start && params.end) {
    startDate = new Date(params.start);
    endDate = new Date(params.end);
    endDate.setHours(23, 59, 59, 999);
    label = 'Custom Range';
  } else {
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        label = 'Today';
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
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        label = 'Last Month';
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        label = 'This Year';
        break;
    }
  }

  const [topProducts, bestProfit, slowMoving, declining, lowStock] = await Promise.all([
    getTopProducts(business.id, startDate, endDate, 15, 'units'),
    getBestProfitProducts(business.id, startDate, endDate, 15),
    getSlowMovingProducts(business.id, 30, 15),
    getDecliningProducts(business.id, { start: startDate, end: endDate, label }, { start: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), end: new Date(startDate.getTime() - 1), label: 'Previous' }),
    getLowStockSummary(business.id),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Top Products</p>
          <p className="text-xl font-bold text-gray-900">{topProducts.length}</p>
          <p className="text-[10px] text-gray-400">Ranked by units sold</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Best Profit</p>
          <p className="text-xl font-bold text-emerald-700">{bestProfit.length}</p>
          <p className="text-[10px] text-gray-400">Ranked by profit margin</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Slow Moving</p>
          <p className="text-xl font-bold text-amber-600">{slowMoving.length}</p>
          <p className="text-[10px] text-gray-400">No sales in 30+ days</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Declining</p>
          <p className="text-xl font-bold text-red-600">{declining.length}</p>
          <p className="text-[10px] text-gray-400">Sales down 15%+ vs prior</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-gray-900">Top Selling Products</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No sales recorded this period.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{fmtN(p.quantitySold)} {p.unit} sold · {fmt(p.revenue)} revenue</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{p.profitMarginPercent.toFixed(1)}% margin</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-gray-900">Best Profit Products</h2>
          </div>
          {bestProfit.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No sales recorded this period.</p>
          ) : (
            <div className="space-y-2">
              {bestProfit.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{fmt(p.profit)} profit · {fmt(p.revenue)} revenue</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{p.profitMarginPercent.toFixed(1)}% margin</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-gray-900">Slow-Moving Stock</h2>
          </div>
          {slowMoving.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No slow-moving products detected.</p>
          ) : (
            <div className="space-y-2">
              {slowMoving.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.currentStock} units · {fmt(p.stockValue)} value</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{p.daysSinceLastSale}d idle</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Minus className="w-4 h-4 text-red-600" />
            <h2 className="font-bold text-gray-900">Declining Products</h2>
            <span className="text-[10px] text-gray-400 font-normal">(≥15% decline vs previous period)</span>
          </div>
          {declining.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No declining products detected.</p>
          ) : (
            <div className="space-y-2">
              {declining.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{fmt(p.previousRevenue)} → {fmt(p.currentRevenue)}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    {p.declinePercent !== null ? `-${p.declinePercent.toFixed(1)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
