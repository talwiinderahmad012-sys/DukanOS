import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getDailyReport } from '@/services/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  ChevronRight, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  ShoppingCart, 
  Package, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;
  const dateInput = params.date;

  const report = await getDailyReport(business.id, dateInput, business.timezone);
  const { summary, growth, hourlyData, topProductsToday, sales, date } = report;

  // Filter hourlyData to show non-zero hours or 8 AM to 11 PM range
  const activeHours = hourlyData.filter((h) => h.hour >= 8 && h.hour <= 22);
  const chartData = activeHours.map((h) => ({
    label: h.label,
    value1: h.revenue,
    value2: h.orders * 100, // scaled for visual presence or just revenue
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Date Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/reports" className="hover:text-blue-600 transition-colors">
            Reports
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Daily Report</span>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Daily Financial Audit
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            Report for {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Calculated from {summary.ordersCount} completed customer transactions and store expenses.
          </p>
        </div>

        {/* Growth vs Yesterday */}
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            growth.revenueGrowth.status === 'UP' ? 'bg-green-100 text-green-700' : growth.revenueGrowth.status === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {growth.revenueGrowth.status === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-semibold block">VS YESTERDAY</span>
            <span className={`text-sm font-bold ${
              growth.revenueGrowth.status === 'UP' ? 'text-green-700' : growth.revenueGrowth.status === 'DOWN' ? 'text-red-600' : 'text-gray-700'
            }`}>
              {growth.revenueGrowth.formatted} Revenue
            </span>
          </div>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase">Gross Sales</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">
            Rs. {summary.grossRevenue.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 mt-1">{summary.ordersCount} orders</p>
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
          <span className="text-xs font-semibold text-red-700 uppercase">Expenses</span>
          <h3 className="text-2xl font-bold text-red-700 mt-1">
            Rs. {summary.expenses.toLocaleString()}
          </h3>
          <p className="text-xs text-red-500 mt-1">Daily operational costs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase">Net Profit</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">
            Rs. {summary.netProfit.toLocaleString()}
          </h3>
          <p className="text-xs text-blue-500 mt-1">After expenses</p>
        </div>

      </div>

      {/* Secondary Financial Metrics: Credit, Payments, Purchases */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">New Customer Credit (Udhaar)</span>
            <p className="text-lg font-bold text-orange-600 mt-0.5">Rs. {summary.creditGiven.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Debt Payments Received</span>
            <p className="text-lg font-bold text-green-600 mt-0.5">Rs. {summary.paymentsReceived.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Inventory Procurement Spend</span>
            <p className="text-lg font-bold text-gray-900 mt-0.5">Rs. {summary.purchaseSpend.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Hourly Sales Distribution Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Hourly Sales Distribution</h3>
        <SimpleBarChart
          data={chartData}
          height={200}
          label1="Sales Revenue"
          label2="Order Volume (x100)"
          color1="#2563eb"
          color2="#93c5fd"
        />
      </div>

      {/* Top Products Sold Today */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Top Products Sold on {date}</h3>
        {topProductsToday.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No items sold on this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-center">Quantity Sold</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">Realized Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProductsToday.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.name}
                      {item.sku && <span className="block text-xs text-gray-400 font-mono">SKU: {item.sku}</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      Rs. {item.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">
                      Rs. {item.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices Processed Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Transactions Log ({sales.length})</h3>
        {sales.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No transactions on this date.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{s.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(s.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{s.customer ? s.customer.name : 'Walk-in'}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {Number(s.total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">Rs. {Number(s.paidAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      <Link href={`/dashboard/sales/${s.id}`} className="text-blue-600 hover:underline">
                        View Invoice &rarr;
                      </Link>
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
