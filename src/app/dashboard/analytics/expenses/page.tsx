import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import { getExpenseAnalytics } from '@/services/analytics';
import Link from 'next/link';
import {
  ArrowLeft, Receipt, TrendingUp, Tag,
  BarChart3
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

export default async function ExpensesAnalyticsPage({
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
  let prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  let prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  let prevLabel = 'Last Month';

  if (preset === 'lastMonth') {
    startDate = prevStart;
    endDate = prevEnd;
    label = 'Last Month';
  } else if (preset === 'thisYear') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    label = 'This Year';
    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    prevLabel = 'Last Year';
  }

  const expenseAnalytics = await getExpenseAnalytics(
    business.id,
    { start: startDate, end: endDate, label },
    { start: prevStart, end: prevEnd, label: prevLabel }
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">{label} · Operational breakdown</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Expenses</p>
          <p className="text-xl font-bold text-red-700">{fmt(expenseAnalytics.totalCurrent)}</p>
          <p className="text-[10px] text-gray-400">Previous: {fmt(expenseAnalytics.totalPrevious)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Growth</p>
          <p className="text-xl font-bold text-gray-900">
            {expenseAnalytics.totalGrowth.status === 'UP' ? '+' : ''}
            {expenseAnalytics.totalGrowth.percentage?.toFixed(1) || '0.0'}%
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Categories</p>
          <p className="text-xl font-bold text-gray-900">{expenseAnalytics.categories.length}</p>
          <p className="text-[10px] text-gray-400">Active categories</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Transactions</p>
          <p className="text-xl font-bold text-gray-900">{fmtN(expenseAnalytics.expenseCount)}</p>
          <p className="text-[10px] text-gray-400">Expense records</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-orange-600" />
          <h2 className="font-bold text-gray-900">Expenses by Category</h2>
        </div>
        {expenseAnalytics.categories.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No expenses recorded this period.</p>
        ) : (
          <div className="space-y-2">
            {expenseAnalytics.categories.map(cat => (
              <div key={cat.category} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-900">{cat.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-900">{fmt(cat.amount)}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
