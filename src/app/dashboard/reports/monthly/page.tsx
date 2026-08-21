import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getMonthlyReport, getTopSellingProducts } from '@/services/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  ShoppingBag
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;

  const [monthlyData, topProducts] = await Promise.all([
    getMonthlyReport(business.id, year, month, business.timezone),
    getTopSellingProducts(business.id, { limit: 5 }),
  ]);

  const { summary, growth, dailyData, expenseCategories, monthName } = monthlyData;

  const chartData = dailyData.map((d) => ({
    label: `${d.day}`,
    value1: d.revenue,
    value2: d.profit,
    value3: d.expenses,
  }));

  const monthsList = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Month/Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/reports" className="hover:text-blue-600 transition-colors">
            Reports
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Monthly Report</span>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <select
            name="month"
            defaultValue={month}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthsList.map((m) => (
              <option key={m.num} value={m.num}>
                {m.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            name="year"
            defaultValue={year}
            min="2020"
            max="2030"
            className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">
            Monthly Financial Statement
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {monthName} {year}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete reconciliation of monthly income, margins, expenditures, and product velocities.
          </p>
        </div>

        {/* Growth vs Previous Month */}
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.revenueGrowth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.revenueGrowth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.revenueGrowth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">VS LAST MONTH</span>
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
          <span className="text-xs font-semibold text-gray-500 uppercase">Gross Revenue</span>
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
          <span className="text-xs font-semibold text-red-700 uppercase">Monthly Expenses</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            Rs. {summary.expenses.toLocaleString()}
          </h3>
          <p className="text-xs text-red-500 mt-1">Operating costs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase">Net Profit</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">
            Rs. {summary.netProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-blue-500 mt-1">Final bottom line</p>
        </div>
      </div>

      {/* Daily Breakdown Chart throughout Month */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Daily Trends (Day 1 – {dailyData.length})</h3>
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

      {/* Expense Categories Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Expense Categories */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-red-600" /> Expense Allocation
            </h3>
            <span className="text-xs text-gray-400">Total: Rs. {summary.expenses.toLocaleString()}</span>
          </div>

          {expenseCategories.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">No expenses recorded for this month.</div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {expenseCategories.map((item) => (
                <div key={item.category} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.category}</p>
                    <div className="w-32 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">Rs. {item.amount.toLocaleString()}</span>
                    <span className="block text-xs text-gray-400">{item.percentage}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Top Products */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" /> Monthly Top Performers
            </h3>
            <span className="text-xs text-gray-400">By Velocity</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">No sales recorded.</div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">Stock: {p.currentStock} {p.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{p.quantitySold} {p.unit}</span>
                    <span className="block text-xs text-green-600">Rs. {p.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
