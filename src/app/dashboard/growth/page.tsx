import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getBusinessGrowth, getMonthlyReport } from '@/services/reports';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Percent, 
  Layers,
  ChevronRight
} from 'lucide-react';
import { SimpleBarChart } from '@/components/charts/bar-chart';

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const periodParam = (params.period || 'MONTHLY').toUpperCase() as 'DAILY' | 'MONTHLY' | 'YEARLY';
  const growth = await getBusinessGrowth(business.id, periodParam, business.timezone);
  const monthlyData = await getMonthlyReport(business.id, undefined, undefined, business.timezone);

  const chartData = monthlyData.dailyData.slice(0, 15).map((d) => ({
    label: `Day ${d.day}`,
    value1: d.revenue,
    value2: d.profit,
  }));

  const metrics = [
    {
      label: 'Revenue Growth',
      growth: growth.revenueGrowth,
      current: `Rs. ${Math.round(growth.currentRevenue).toLocaleString()}`,
      prev: `Rs. ${Math.round(growth.revenueGrowth.previous).toLocaleString()}`,
      desc: 'Top-line sales performance',
    },
    {
      label: 'Gross Profit Growth',
      growth: growth.profitGrowth,
      current: `Rs. ${Math.round(growth.currentProfit).toLocaleString()}`,
      prev: `Rs. ${Math.round(growth.profitGrowth.previous).toLocaleString()}`,
      desc: 'Realized gross margins',
    },
    {
      label: 'Net Profit Growth',
      growth: growth.netProfitGrowth,
      current: `Rs. ${Math.round(growth.netProfitGrowth.current).toLocaleString()}`,
      prev: `Rs. ${Math.round(growth.netProfitGrowth.previous).toLocaleString()}`,
      desc: 'Retained earnings after expenses',
    },
    {
      label: 'Order Volume Growth',
      growth: growth.ordersGrowth,
      current: `${growth.currentOrders} orders`,
      prev: `${growth.ordersGrowth.previous} orders`,
      desc: 'Checkout velocity',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Growth & Velocity</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Comparative performance analytics tracking expansion across periods.
          </p>
        </div>

        {/* Period Pills */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'DAILY', label: 'Day-over-Day' },
            { id: 'MONTHLY', label: 'Month-over-Month' },
            { id: 'YEARLY', label: 'Year-over-Year' },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={`/dashboard/growth?period=${tab.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodParam === tab.id
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Growth Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((item) => {
          const isUp = item.growth.status === 'UP';
          const isDown = item.growth.status === 'DOWN';

          return (
            <div
              key={item.label}
              className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{item.label}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      isUp
                        ? 'bg-green-100 text-green-800'
                        : isDown
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isUp && <TrendingUp className="w-3.5 h-3.5" />}
                    {isDown && <TrendingDown className="w-3.5 h-3.5" />}
                    {item.growth.formatted}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mt-2">
                  {item.current}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Previous: {item.prev}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
                <span>{item.desc}</span>
                <span className="font-medium text-gray-700">{growth.period.split(' ')[0]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trajectory Visual Overview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Growth Trajectory Visualization</h3>
            <p className="text-xs text-gray-500">Comparing Revenue and Gross Margin across the current cycle</p>
          </div>
          <Link href="/dashboard/reports/monthly" className="text-xs text-blue-600 hover:underline font-semibold">
            Full Reports &rarr;
          </Link>
        </div>

        <SimpleBarChart
          data={chartData}
          height={220}
          label1="Revenue"
          label2="Gross Profit"
          color1="#2563eb"
          color2="#16a34a"
        />
      </div>

      {/* Strategic Growth Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-blue-900 text-sm">Revenue Scalability</h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            Revenue momentum indicates demand health. Compare volume velocity in the POS to identify peak trading hours and top basket sizes.
          </p>
        </div>

        <div className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-emerald-900 text-sm">Margin Retention</h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Gross profit growth should outpace or match revenue growth. If revenue rises while margin drops, audit product discounts and supplier costs.
          </p>
        </div>

        <div className="p-5 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-purple-900 text-sm">Working Capital Flow</h4>
          <p className="text-xs text-purple-800 leading-relaxed">
            Ensure customer credit (Udhaar) recovery keeps pace with sales expansion so working capital remains available for inventory restocks.
          </p>
        </div>
      </div>
    </div>
  );
}
