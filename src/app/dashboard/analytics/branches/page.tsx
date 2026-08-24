import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import { getBranchAnalytics } from '@/services/analytics';
import Link from 'next/link';
import {
  ArrowLeft, Store, TrendingUp, BarChart3,
  Receipt, Package
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

export default async function BranchesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisYear';
  const now = new Date();
  let startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  let label = 'This Year';

  if (preset === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    label = 'This Month';
  } else if (preset === 'lastMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = 'Last Month';
  }

  const branches = await getBranchAnalytics(business.id, startDate, endDate);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">{label} · {branches.length} branches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(b => (
          <div key={b.branchId} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-bold text-gray-900 text-sm">{b.branchName}</p>
                <p className="text-[10px] text-gray-400 font-mono">{b.branchCode}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Revenue</p>
                <p className="text-sm font-bold text-gray-900">{fmt(b.revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Gross Profit</p>
                <p className="text-sm font-bold text-emerald-700">{fmt(b.grossProfit)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Expenses</p>
                <p className="text-sm font-bold text-orange-600">{fmt(b.expenses)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Net Profit</p>
                <p className={`text-sm font-bold ${b.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmt(b.netProfit)}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
              <span>{b.orderCount} orders</span>
              <span>{b.revenue > 0 ? `${Math.round((b.grossProfit / b.revenue) * 100)}% margin` : '0% margin'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
