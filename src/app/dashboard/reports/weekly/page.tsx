import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getWeeklyReport } from '@/services/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { prisma } from '@/lib/db/prisma';

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branchId?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;
  const dateInput = params.date;
  const branchId = params.branchId;

  const [report, branches] = await Promise.all([
    getWeeklyReport(business.id, dateInput, business.timezone, branchId || undefined),
    prisma.branch.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
  ]);
  const { summary, growth, dayBreakdown, weekStart, weekEnd } = report;

  const chartData = dayBreakdown.map((d) => ({
    label: `${d.dayName} (${d.dateStr.slice(8)})`,
    value1: d.revenue,
    value2: d.grossProfit,
    value3: d.expenses,
  }));

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/reports" className="hover:text-blue-600 transition-colors">
            Reports
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Weekly Report</span>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <select
            name="branchId"
            defaultValue={branchId || 'ALL'}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input
            type="date"
            name="date"
            defaultValue={weekStart.toISOString().slice(0, 10)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {branchId && <input type="hidden" name="branchId" value={branchId} />}
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Apply Week
          </button>
        </form>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Weekly Performance Audit
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            Week of {weekLabel}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Aggregated metrics across Monday through Sunday.
          </p>
        </div>

        {/* Growth vs Previous Week */}
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.revenueGrowth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.revenueGrowth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.revenueGrowth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">VS LAST WEEK</span>
            <span className={`text-sm font-bold ${
              growth.revenueGrowth.status === 'UP' ? 'text-green-700' : growth.revenueGrowth.status === 'DOWN' ? 'text-red-600' : 'text-gray-700'
            }`}>
              {growth.revenueGrowth.formatted} Revenue
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Weekly Revenue</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            Rs. {summary.grossRevenue.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{summary.ordersCount} completed orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase">Gross Profit</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">
            Rs. {summary.grossProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-emerald-600 mt-1">
            {summary.grossRevenue > 0 ? `${Math.round((summary.grossProfit / summary.grossRevenue) * 100)}% margin` : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-red-700 uppercase">Weekly Expenses</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            Rs. {summary.expenses.toLocaleString()}
          </h3>
          <p className="text-xs text-red-500 mt-1">Store operations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase">Net Profit</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">
            Rs. {summary.netProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-blue-500 mt-1">Gross profit - expenses</p>
        </div>
      </div>

      {/* 7-Day Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Day-by-Day Financial Breakdown</h3>
        <SimpleBarChart
          data={chartData}
          height={220}
          label1="Revenue"
          label2="Gross Profit"
          label3="Expenses"
          color1="#2563eb"
          color2="#16a34a"
          color3="#dc2626"
        />
      </div>

      {/* Day by Day Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-base">Daily Summary Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">Day</th>
                <th className="px-5 py-3.5 font-medium">Date</th>
                <th className="px-5 py-3.5 font-medium text-center">Orders</th>
                <th className="px-5 py-3.5 font-medium text-right">Revenue</th>
                <th className="px-5 py-3.5 font-medium text-right">Gross Profit</th>
                <th className="px-5 py-3.5 font-medium text-right">Expenses</th>
                <th className="px-5 py-3.5 font-medium text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dayBreakdown.map((d) => (
                <tr key={d.dateStr} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{d.dayName}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{d.dateStr}</td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">{d.orders}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    Rs. {d.revenue.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-700 font-medium">
                    Rs. {d.grossProfit.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-red-700 font-medium">
                    Rs. {d.expenses.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-blue-700">
                    Rs. {d.netProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
