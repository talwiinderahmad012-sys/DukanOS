import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getYearlyReport } from '@/services/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';

export default async function YearlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();

  const report = await getYearlyReport(business.id, year, business.timezone);
  const { summary, growth, monthlyData } = report;

  const chartData = monthlyData.map((m) => ({
    label: m.monthName,
    value1: m.revenue,
    value2: m.grossProfit,
    value3: m.expenses,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/reports" className="hover:text-blue-600 transition-colors">
            Reports
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Yearly Report</span>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <input
            type="number"
            name="year"
            defaultValue={year}
            min="2020"
            max="2030"
            className="w-28 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Apply Year
          </button>
        </form>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
            Annual Financial Audit
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            Year {year} Financial Statement
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Comprehensive full-year business velocity, aggregate revenue, and net profit margins.
          </p>
        </div>

        {/* Growth vs Previous Year */}
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.revenueGrowth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.revenueGrowth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.revenueGrowth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">VS LAST YEAR</span>
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
          <span className="text-xs font-semibold text-gray-500 uppercase">Annual Revenue</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            Rs. {summary.grossRevenue.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{summary.ordersCount} total orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase">Annual Gross Profit</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">
            Rs. {summary.grossProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-emerald-600 mt-1">
            {summary.grossRevenue > 0 ? `${Math.round((summary.grossProfit / summary.grossRevenue) * 100)}% margin` : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-red-700 uppercase">Annual Expenses</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            Rs. {summary.expenses.toLocaleString()}
          </h3>
          <p className="text-xs text-red-500 mt-1">Total operating costs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase">Annual Net Profit</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">
            Rs. {summary.netProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-blue-500 mt-1">Total retained margin</p>
        </div>
      </div>

      {/* 12-Month Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">12-Month Annual Trend</h3>
        <SimpleBarChart
          data={chartData}
          height={240}
          label1="Revenue"
          label2="Gross Profit"
          label3="Expenses"
          color1="#2563eb"
          color2="#16a34a"
          color3="#dc2626"
        />
      </div>

      {/* 12-Month Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-base">Monthly Breakdown ({year})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-5 py-3.5 font-medium">Month</th>
                <th className="px-5 py-3.5 font-medium text-center">Orders</th>
                <th className="px-5 py-3.5 font-medium text-right">Revenue</th>
                <th className="px-5 py-3.5 font-medium text-right">Gross Profit</th>
                <th className="px-5 py-3.5 font-medium text-right">Expenses</th>
                <th className="px-5 py-3.5 font-medium text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyData.map((m) => (
                <tr key={m.month} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{m.monthName}</td>
                  <td className="px-5 py-3.5 text-center font-medium text-gray-700">{m.orders}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    Rs. {m.revenue.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-700 font-medium">
                    Rs. {m.grossProfit.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-red-700 font-medium">
                    Rs. {m.expenses.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-blue-700">
                    Rs. {m.netProfit.toLocaleString()}
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
