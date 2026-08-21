import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getMonthlyReport, getTopSellingProducts, getSlowMovingProducts } from '@/services/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ChevronRight, 
  Package, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';

export default async function ReportsHubPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const [monthlyData, topProducts, slowProducts] = await Promise.all([
    getMonthlyReport(business.id, undefined, undefined, business.timezone),
    getTopSellingProducts(business.id, { limit: 5 }),
    getSlowMovingProducts(business.id, { daysThreshold: 30, limit: 5 }),
  ]);

  const reportNav = [
    {
      title: 'Daily Report',
      desc: "Today's sales, gross profit, expenses, orders, and hourly trends.",
      href: '/dashboard/reports/daily',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      title: 'Weekly Report',
      desc: '7-day day-by-day comparison, weekly volume, and net margins.',
      href: '/dashboard/reports/weekly',
      icon: BarChart3,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      title: 'Monthly Report',
      desc: 'Month-over-month growth, category breakdown, and monthly trends.',
      href: '/dashboard/reports/monthly',
      icon: Calendar,
      color: 'bg-green-50 text-green-600 border-green-100',
    },
    {
      title: 'Yearly Report',
      desc: '12-month annual overview, annual revenue, and year-over-year deltas.',
      href: '/dashboard/reports/yearly',
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ];

  // Chart items for the current month
  const chartData = monthlyData.dailyData.slice(0, 15).map((d) => ({
    label: `Day ${d.day}`,
    value1: d.revenue,
    value2: d.profit,
    value3: d.expenses,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Audit-grade transactional reports, revenue analysis, profit margins, and performance insights.
        </p>
      </div>

      {/* Report Categories Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Open Report</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Month-to-Date Performance Overview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {monthlyData.monthName} {monthlyData.year} Snapshot
            </h2>
            <p className="text-xs text-gray-500">Real-time aggregated performance across the current calendar month</p>
          </div>
          <Link
            href="/dashboard/reports/monthly"
            className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
          >
            View Full Month Details &rarr;
          </Link>
        </div>

        {/* Financial Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium">Gross Revenue</span>
            <h4 className="text-xl font-bold text-gray-900 mt-1">
              Rs. {monthlyData.summary.grossRevenue.toLocaleString()}
            </h4>
            <span className="text-[11px] text-gray-400">{monthlyData.summary.ordersCount} orders</span>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <span className="text-xs text-emerald-800 font-medium">Gross Profit</span>
            <h4 className="text-xl font-bold text-emerald-700 mt-1">
              Rs. {monthlyData.summary.grossProfit.toLocaleString()}
            </h4>
            <span className="text-[11px] text-emerald-600">
              {monthlyData.summary.grossRevenue > 0
                ? `${Math.round((monthlyData.summary.grossProfit / monthlyData.summary.grossRevenue) * 100)}% margin`
                : '0% margin'}
            </span>
          </div>

          <div className="p-4 bg-red-50/70 rounded-xl border border-red-100">
            <span className="text-xs text-red-800 font-medium">Expenses</span>
            <h4 className="text-xl font-bold text-red-700 mt-1">
              Rs. {monthlyData.summary.expenses.toLocaleString()}
            </h4>
            <span className="text-[11px] text-red-600">Store overheads</span>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100">
            <span className="text-xs text-blue-800 font-medium">Net Profit</span>
            <h4 className="text-xl font-bold text-blue-700 mt-1">
              Rs. {monthlyData.summary.netProfit.toLocaleString()}
            </h4>
            <span className="text-[11px] text-blue-600">Profit after expenses</span>
          </div>
        </div>

        {/* Bar Chart Trend */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Daily Trend (Days 1–15)
          </h4>
          <SimpleBarChart data={chartData} height={200} />
        </div>
      </div>

      {/* Product Analytics: Top Sellers & Slow Moving Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Top-Selling Products
            </h3>
            <span className="text-xs text-gray-400">By Quantity Sold</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">No sales data recorded yet.</div>
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

        {/* Slow Moving Products */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Slow-Moving Inventory
            </h3>
            <span className="text-xs text-gray-400">30+ Days No Sales</span>
          </div>

          {slowProducts.length === 0 ? (
            <div className="py-8 text-center text-green-600 text-xs font-medium">
              No slow-moving inventory detected. All items are selling actively.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-sm">
              {slowProducts.map((p) => (
                <div key={p.productId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.currentStock} {p.unit} in stock</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-700">Rs. {Math.round(p.stockValue).toLocaleString()}</span>
                    <span className="block text-xs text-gray-400">Tied-up capital</span>
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
