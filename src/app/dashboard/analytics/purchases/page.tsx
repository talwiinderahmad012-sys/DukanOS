import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getPurchaseAnalytics,
} from '@/services/analytics';
import Link from 'next/link';
import {
  ArrowLeft, Package, Truck, TrendingUp,
  Receipt, BarChart3
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

export default async function PurchasesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let label = 'This Month';

  if (preset === 'lastMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = 'Last Month';
  } else if (preset === 'thisYear') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    label = 'This Year';
  }

  const prevStart = new Date(startDate);
  const prevEnd = new Date(endDate);
  const diffMs = endDate.getTime() - startDate.getTime();
  prevStart.setTime(prevStart.getTime() - diffMs);
  prevEnd.setTime(prevEnd.getTime() - diffMs);
  const period = { start: startDate, end: endDate, label };
  const comparisonPeriod = { start: prevStart, end: prevEnd, label: 'Previous Period' };

  const purchaseAnalytics = await getPurchaseAnalytics(business.id, period, comparisonPeriod);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">{label} vs {comparisonPeriod.label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Spend</p>
          <p className="text-xl font-bold text-gray-900">{fmt(purchaseAnalytics.totalSpend.current)}</p>
          <p className="text-[10px] text-gray-400">Previous: {fmt(purchaseAnalytics.totalSpend.previous)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Purchase Orders</p>
          <p className="text-xl font-bold text-gray-900">{fmtN(purchaseAnalytics.orderCount.current)}</p>
          <p className="text-[10px] text-gray-400">Previous: {fmtN(purchaseAnalytics.orderCount.previous)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Avg Order Value</p>
          <p className="text-xl font-bold text-gray-900">
            {purchaseAnalytics.orderCount.current > 0 ? fmt(purchaseAnalytics.totalSpend.current / purchaseAnalytics.orderCount.current) : 'Rs. 0'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Growth</p>
          <p className="text-xl font-bold text-gray-900">
            {purchaseAnalytics.totalSpend.growth.status === 'UP' ? '+' : ''}
            {purchaseAnalytics.totalSpend.growth.percentage?.toFixed(1) || '0.0'}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-gray-900">Top Suppliers</h2>
        </div>
        {purchaseAnalytics.topSuppliers.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No purchase data for this period.</p>
        ) : (
          <div className="space-y-2">
            {purchaseAnalytics.topSuppliers.slice(0, 15).map(s => (
              <div key={s.supplierId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-gray-900">{s.name}</p>
                  <p className="text-[10px] text-gray-400">{s.purchaseCount} orders · Last: {s.lastPurchaseDate ? new Date(s.lastPurchaseDate).toLocaleDateString() : '—'}</p>
                </div>
                <span className="text-xs font-bold text-gray-900">{fmt(s.totalSpend)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
