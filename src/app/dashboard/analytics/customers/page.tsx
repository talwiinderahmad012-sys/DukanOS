import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getTopCustomers,
  getCustomerGrowth,
  getUdhaarAnalytics,
  getCurrentMonthPeriods,
} from '@/services/analytics';
import Link from 'next/link';
import {
  ArrowLeft, Users, TrendingUp, AlertCircle,
  UserPlus, Receipt
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

export default async function CustomersAnalyticsPage({
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

  const period = { start: startDate, end: endDate, label };

  const [topCustomers, customerGrowth, udhaar] = await Promise.all([
    getTopCustomers(business.id, 20, startDate, endDate),
    getCustomerGrowth(business.id, business.timezone || 'Asia/Karachi'),
    getUdhaarAnalytics(business.id, period, business.timezone || 'Asia/Karachi'),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Customers</p>
          <p className="text-xl font-bold text-gray-900">{fmtN(customerGrowth.totalActive)}</p>
          <p className="text-[10px] text-gray-400">Active customers</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">New This Month</p>
          <p className="text-xl font-bold text-emerald-700">{fmtN(customerGrowth.newThisMonth)}</p>
          <p className="text-[10px] text-gray-400">Acquired this month</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Outstanding Udhaar</p>
          <p className="text-xl font-bold text-rose-600">{fmt(udhaar.totalOutstanding)}</p>
          <p className="text-[10px] text-gray-400">Total credit balance</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Credit Recovery</p>
          <p className="text-xl font-bold text-blue-700">{fmt(udhaar.paymentsReceivedThisPeriod)}</p>
          <p className="text-[10px] text-gray-400">Collected this period</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <h2 className="font-bold text-gray-900">Top Customers</h2>
        {topCustomers.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No customer purchases recorded this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">Customer</th>
                  <th className="text-right py-2 px-2">Orders</th>
                  <th className="text-right py-2 px-2">Total Spent</th>
                  <th className="text-right py-2 pl-2">Udhaar</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.customerId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.phone && <p className="text-gray-400 font-mono text-[10px]">{c.phone}</p>}
                    </td>
                    <td className="py-2 px-2 text-right">{c.orderCount}</td>
                    <td className="py-2 px-2 text-right font-semibold">{fmt(c.totalSpent)}</td>
                    <td className={`py-2 pl-2 text-right font-semibold ${c.outstanding > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                      {c.outstanding > 0 ? fmt(c.outstanding) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {udhaar.topDebtors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <h2 className="font-bold text-gray-900">Top Outstanding Balances</h2>
          <div className="space-y-2">
            {udhaar.topDebtors.map(d => (
              <div key={d.customerId} className="flex items-center justify-between py-2 px-4 bg-rose-50/50 rounded-xl">
                <span className="text-xs font-semibold text-gray-900">{d.name}</span>
                <span className="text-xs font-bold text-rose-600">{fmt(d.outstanding)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
