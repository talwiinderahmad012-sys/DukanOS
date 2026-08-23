import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import {
  getAnalyticsKPIs,
  getSalesTrend,
  getMonthlyGrowthTable,
  getYearlyComparison,
  getTopProducts,
  getSlowMovingProducts,
  getDeadStock,
  getLowStockSummary,
  getTopCustomers,
  getCustomerGrowth,
  getUdhaarAnalytics,
  getPurchaseAnalytics,
  getBranchAnalytics,
  getInventoryValuation,
  getCurrentMonthPeriods,
  getEmployeePayrollAnalytics,
} from '@/services/analytics';
import { calculateBusinessHealth } from '@/services/analytics/health-score';
import { generateBusinessInsights } from '@/services/analytics/insights';
import { SimpleBarChart } from '@/components/charts/bar-chart';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus,
  ShoppingCart, DollarSign, Package, Users,
  AlertCircle, AlertTriangle, CheckCircle2,
  ArrowUpRight, BarChart3, Receipt, Layers,
  Activity
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

function GrowthBadge({ growth }: { growth: any }) {
  const { status, formatted } = growth;
  if (status === 'NO_BASELINE') return <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">New</span>;
  if (status === 'UP')   return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingUp className="w-3 h-3"/>{formatted}</span>;
  if (status === 'DOWN') return <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-0.5"><TrendingDown className="w-3 h-3"/>{formatted}</span>;
  return <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Minus className="w-3 h-3"/>{formatted}</span>;
}

function KPICard({ label, value, growth, sub, icon: Icon, accent }: { label: string; value: string; growth?: any; sub?: string; icon: any; accent?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent || 'bg-blue-50 text-blue-600'}`}>
          <Icon className="w-4 h-4" />
        </div>
        {growth && <GrowthBadge growth={growth} />}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // Only OWNER and MANAGER see full analytics
  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';
  if (!isOwnerOrManager) redirect('/dashboard');

  const { period, comparisonPeriod } = getCurrentMonthPeriods();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const tz = business.timezone || 'Asia/Karachi';

  const [
    kpis,
    trend30,
    monthlyGrowth,
    yearlyComp,
    topProducts,
    slowProducts,
    deadStock,
    lowStock,
    topCustomers,
    customerGrowth,
    udhaar,
    purchaseAnalytics,
    branches,
    inventory,
    health,
    insights,
    payroll,
  ] = await Promise.all([
    getAnalyticsKPIs(business.id, period, comparisonPeriod),
    getSalesTrend(business.id, 30, tz),
    getMonthlyGrowthTable(business.id, now.getFullYear(), tz),
    getYearlyComparison(business.id, tz),
    getTopProducts(business.id, period.start, period.end, 10, 'units'),
    getSlowMovingProducts(business.id, 30, 10),
    getDeadStock(business.id, 90, 10),
    getLowStockSummary(business.id),
    getTopCustomers(business.id, 10, period.start, period.end),
    getCustomerGrowth(business.id, tz),
    getUdhaarAnalytics(business.id, period, tz),
    getPurchaseAnalytics(business.id, period, comparisonPeriod),
    getBranchAnalytics(business.id, yearStart, now),
    getInventoryValuation(business.id),
    calculateBusinessHealth(business.id, tz),
    generateBusinessInsights(business.id, tz),
    getEmployeePayrollAnalytics(business.id, period),
  ]);

  const trendChartData = trend30.slice(-30).map(d => ({
    label: d.date.slice(5),
    value1: d.revenue,
    value2: d.profit,
  }));

  const monthlyChartData = monthlyGrowth.map(m => ({
    label: m.monthName.slice(0, 3),
    value1: m.revenue,
    value2: m.grossProfit,
    value3: m.expenses,
  }));

  const healthColor =
    health.status === 'Excellent' ? 'text-emerald-600' :
    health.status === 'Healthy'   ? 'text-blue-600' :
    health.status === 'Needs Attention' ? 'text-amber-600' : 'text-red-600';

  const healthBg =
    health.status === 'Excellent' ? 'bg-emerald-50 border-emerald-200' :
    health.status === 'Healthy'   ? 'bg-blue-50 border-blue-200' :
    health.status === 'Needs Attention' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const insightPriorityColor = (p: string) =>
    p === 'HIGH' ? 'bg-red-100 text-red-700' :
    p === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {period.label} vs {comparisonPeriod.label} · All figures from real data
          </p>
        </div>
        <Link
          href="/dashboard/growth"
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
        >
          Growth Report <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Key Performance Indicators — {period.label}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label="Total Sales"      value={fmt(kpis.totalSales.current)}     growth={kpis.totalSales.growth}     sub={`prev: ${fmt(kpis.totalSales.previous)}`}    icon={DollarSign}   accent="bg-blue-50 text-blue-600" />
          <KPICard label="Gross Profit"     value={fmt(kpis.grossProfit.current)}    growth={kpis.grossProfit.growth}    sub={`prev: ${fmt(kpis.grossProfit.previous)}`}   icon={TrendingUp}   accent="bg-emerald-50 text-emerald-600" />
          <KPICard label="Expenses"         value={fmt(kpis.expenses.current)}       growth={kpis.expenses.growth}       sub={`prev: ${fmt(kpis.expenses.previous)}`}      icon={Receipt}      accent="bg-orange-50 text-orange-600" />
          <KPICard label="Net Profit"       value={fmt(kpis.netProfit.current)}      growth={kpis.netProfit.growth}      sub={`prev: ${fmt(kpis.netProfit.previous)}`}     icon={BarChart3}    accent="bg-violet-50 text-violet-600" />
          <KPICard label="Total Purchases"  value={fmt(kpis.totalPurchases.current)} growth={kpis.totalPurchases.growth} sub={`prev: ${fmt(kpis.totalPurchases.previous)}`}icon={Package}      accent="bg-cyan-50 text-cyan-600" />
          <KPICard label="Outstanding Udhaar" value={fmt(kpis.outstandingUdhaar.current)} sub="Total across all customers" icon={AlertCircle} accent="bg-rose-50 text-rose-600" />
          <KPICard label="Products Sold"    value={`${fmtN(kpis.productsSold.current)} units`}   growth={kpis.productsSold.growth}  sub={`prev: ${fmtN(kpis.productsSold.previous)} units`}  icon={Layers}   accent="bg-indigo-50 text-indigo-600" />
          <KPICard label="Avg Order Value"  value={fmt(kpis.avgOrderValue.current)}  growth={kpis.avgOrderValue.growth}  sub={`${fmtN(kpis.orderCount.current)} orders this month`}    icon={ShoppingCart} accent="bg-teal-50 text-teal-600" />
        </div>
      </section>

      {/* ── Sales & Profit Trend (30 days) ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">Sales & Profit Trend</h2>
            <p className="text-xs text-gray-500 mt-0.5">Last 30 days — completed sales only, cancelled excluded</p>
          </div>
        </div>
        <SimpleBarChart data={trendChartData} label1="Revenue" label2="Gross Profit" height={220} color1="#2563eb" color2="#16a34a" />
      </section>

      {/* ── Monthly Growth Table ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Monthly Business Growth — {now.getFullYear()}</h2>
          <p className="text-xs text-gray-500 mt-0.5">Month-over-month comparison. Growth % vs preceding month.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-gray-500 font-semibold border-b border-gray-100">
                <th className="text-left py-2 pr-4">Month</th>
                <th className="text-right py-2 px-2">Sales</th>
                <th className="text-right py-2 px-2">Gross Profit</th>
                <th className="text-right py-2 px-2">Expenses</th>
                <th className="text-right py-2 px-2">Net Profit</th>
                <th className="text-right py-2 px-2">Orders</th>
                <th className="text-right py-2 px-2">Avg Order</th>
                <th className="text-right py-2 pl-2">Growth</th>
              </tr>
            </thead>
            <tbody>
              {monthlyGrowth.map(m => (
                <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-semibold text-gray-900">{m.monthName.slice(0,3)}</td>
                  <td className="py-2 px-2 text-right">{m.revenue > 0 ? fmt(m.revenue) : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2 text-right text-emerald-700">{m.grossProfit > 0 ? fmt(m.grossProfit) : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2 text-right text-orange-600">{m.expenses > 0 ? fmt(m.expenses) : <span className="text-gray-300">—</span>}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${m.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{m.revenue > 0 || m.expenses > 0 ? fmt(m.netProfit) : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2 text-right">{m.orders > 0 ? m.orders : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2 text-right">{m.avgOrderValue > 0 ? fmt(m.avgOrderValue) : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 pl-2 text-right">
                    {m.month === 1 ? <span className="text-gray-400 text-[10px]">—</span> :
                     m.growthStatus === 'NO_BASELINE' ? <span className="text-[10px] text-gray-500">New</span> :
                     m.growthStatus === 'UP' ? <span className="text-[10px] font-bold text-emerald-700">+{m.growthPercent?.toFixed(1)}%</span> :
                     m.growthStatus === 'DOWN' ? <span className="text-[10px] font-bold text-red-600">{m.growthPercent?.toFixed(1)}%</span> :
                     <span className="text-[10px] text-gray-500">0%</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Monthly chart */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">Monthly Overview Chart</p>
          <SimpleBarChart data={monthlyChartData} label1="Revenue" label2="Gross Profit" label3="Expenses" height={180} color1="#2563eb" color2="#16a34a" color3="#ef4444" />
        </div>
      </section>

      {/* ── Yearly Comparison ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Year-over-Year Comparison</h2>
          <p className="text-xs text-gray-500 mt-0.5">{yearlyComp.current.year} vs {yearlyComp.previous.year}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { label: 'Revenue',      cur: yearlyComp.current.revenue,      prev: yearlyComp.previous.revenue,      g: yearlyComp.growth.revenue },
            { label: 'Gross Profit', cur: yearlyComp.current.grossProfit,  prev: yearlyComp.previous.grossProfit,  g: yearlyComp.growth.grossProfit },
            { label: 'Expenses',     cur: yearlyComp.current.expenses,     prev: yearlyComp.previous.expenses,     g: yearlyComp.growth.expenses },
            { label: 'Net Profit',   cur: yearlyComp.current.netProfit,    prev: yearlyComp.previous.netProfit,    g: yearlyComp.growth.netProfit },
            { label: 'Orders',       cur: yearlyComp.current.orders,       prev: yearlyComp.previous.orders,       g: yearlyComp.growth.orders, isNum: true },
            { label: 'Products Sold',cur: yearlyComp.current.productsSold, prev: yearlyComp.previous.productsSold, g: yearlyComp.growth.productsSold, isNum: true },
            { label: 'New Customers',cur: yearlyComp.current.newCustomers, prev: yearlyComp.previous.newCustomers, g: yearlyComp.growth.newCustomers, isNum: true },
          ] as any[]).map(({ label, cur, prev, g, isNum }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{isNum ? fmtN(cur) : fmt(cur)}</p>
              <p className="text-[10px] text-gray-400">prev: {isNum ? fmtN(prev) : fmt(prev)}</p>
              <div className="mt-1"><GrowthBadge growth={g} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Products ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">Top Selling Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">{period.label} · ranked by units sold · profit from historical sale records</p>
          </div>
          <Link href="/dashboard/products" className="text-xs font-semibold text-blue-600 hover:underline">All products →</Link>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No sales recorded this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">Product</th>
                  <th className="text-right py-2 px-2">Units Sold</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                  <th className="text-right py-2 px-2">Profit</th>
                  <th className="text-right py-2 px-2">Margin</th>
                  <th className="text-right py-2 pl-2">In Stock</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.sku && <p className="text-gray-400 font-mono text-[10px]">{p.sku}</p>}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">{fmtN(p.quantitySold)} {p.unit}</td>
                    <td className="py-2 px-2 text-right">{fmt(p.revenue)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700">{fmt(p.profit)}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${p.profitMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-700' : p.profitMarginPercent >= 10 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.profitMarginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <span className={p.currentStock <= 0 ? 'text-red-600 font-bold' : p.currentStock <= 5 ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                        {p.currentStock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Slow-Moving + Dead Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">Slow-Moving Stock</h2>
            <p className="text-xs text-gray-500 mt-0.5">Products with stock but no sales in 30+ days (excludes &lt;14 day old products)</p>
          </div>
          {slowProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No slow-moving products detected.</p>
          ) : (
            <div className="space-y-2">
              {slowProducts.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.currentStock} units · {fmt(p.stockValue)} value</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{p.daysSinceLastSale}d idle</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">Dead Stock</h2>
            <p className="text-xs text-gray-500 mt-0.5">No sales in 90+ days — capital tied up</p>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No dead stock detected.</p>
          ) : (
            <div className="space-y-2">
              {deadStock.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.currentStock} units · {fmt(p.inventoryValue)}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{p.daysSinceLastSale}d</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Low Stock ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Inventory Stock Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time stock levels across {lowStock.total} active products</p>
          </div>
          <Link href="/dashboard/inventory" className="text-xs font-semibold text-blue-600 hover:underline">View Inventory →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Out of Stock', count: lowStock.outOfStock, color: 'bg-red-50 border-red-200', textColor: 'text-red-700' },
            { label: 'Critical',     count: lowStock.critical,   color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
            { label: 'Low Stock',    count: lowStock.low,        color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
            { label: 'Healthy',      count: lowStock.healthy,    color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700' },
          ].map(({ label, count, color, textColor }) => (
            <div key={label} className={`p-4 rounded-2xl border ${color} text-center`}>
              <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top Customers ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">Top Customers</h2>
            <p className="text-xs text-gray-500 mt-0.5">{period.label} · ranked by total spent · cancelled sales excluded</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500">
            <span>New this month: <strong className="text-gray-900">{customerGrowth.newThisMonth}</strong></span>
            <GrowthBadge growth={customerGrowth.growth} />
          </div>
        </div>
        {topCustomers.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No customer purchases recorded this month.</p>
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
      </section>

      {/* ── Udhaar Analytics ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Udhaar Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">{period.label} credit activity</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Outstanding', value: fmt(udhaar.totalOutstanding),      color: 'text-rose-600' },
            { label: 'New Credit',        value: fmt(udhaar.newCreditThisPeriod),   color: 'text-amber-600' },
            { label: 'Payments Received', value: fmt(udhaar.paymentsReceivedThisPeriod), color: 'text-emerald-600' },
            { label: 'Net Change',        value: fmt(udhaar.netChange), color: udhaar.netChange > 0 ? 'text-rose-600' : 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        {udhaar.topDebtors.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Top Outstanding Balances</p>
            <div className="space-y-1">
              {udhaar.topDebtors.map(d => (
                <div key={d.customerId} className="flex items-center justify-between py-1.5 px-3 bg-rose-50/50 rounded-xl">
                  <span className="text-xs font-semibold text-gray-900">{d.name}</span>
                  <span className="text-xs font-bold text-rose-600">{fmt(d.outstanding)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Purchase Analytics ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Purchase Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">{period.label} vs {comparisonPeriod.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Spend</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(purchaseAnalytics.totalSpend.current)}</p>
            <div className="mt-1"><GrowthBadge growth={purchaseAnalytics.totalSpend.growth} /></div>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Purchase Orders</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmtN(purchaseAnalytics.orderCount.current)}</p>
            <div className="mt-1"><GrowthBadge growth={purchaseAnalytics.orderCount.growth} /></div>
          </div>
        </div>
        {purchaseAnalytics.topSuppliers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Top Suppliers</p>
            <div className="space-y-1">
              {purchaseAnalytics.topSuppliers.slice(0, 5).map(s => (
                <div key={s.supplierId} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{fmt(s.totalSpend)}</span>
                    <span className="text-[10px] text-gray-400 ml-2">({s.purchaseCount} orders)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Branch Analytics ── */}
      {branches.length > 1 && (
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">Branch Performance</h2>
            <p className="text-xs text-gray-500 mt-0.5">Year to date · All {branches.length} branches</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-500 font-semibold border-b border-gray-100">
                  <th className="text-left py-2 pr-3">Branch</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                  <th className="text-right py-2 px-2">Gross Profit</th>
                  <th className="text-right py-2 px-2">Expenses</th>
                  <th className="text-right py-2 px-2">Net Profit</th>
                  <th className="text-right py-2 pl-2">Orders</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.branchId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-gray-900">{b.branchName}</p>
                      <p className="text-gray-400 font-mono text-[10px]">{b.branchCode}</p>
                    </td>
                    <td className="py-2 px-2 text-right">{fmt(b.revenue)}</td>
                    <td className="py-2 px-2 text-right text-emerald-700">{fmt(b.grossProfit)}</td>
                    <td className="py-2 px-2 text-right text-orange-600">{fmt(b.expenses)}</td>
                    <td className={`py-2 px-2 text-right font-semibold ${b.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmt(b.netProfit)}</td>
                    <td className="py-2 pl-2 text-right">{b.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Inventory Valuation ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Inventory Valuation</h2>
          <p className="text-xs text-gray-500 mt-0.5">{inventory.note}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Units',      value: fmtN(inventory.totalUnits),           plain: true },
            { label: 'Total Value',      value: fmt(inventory.totalValue),             color: 'text-blue-700' },
            { label: 'Low Stock Value',  value: fmt(inventory.lowStockValue),          color: 'text-amber-600' },
            { label: 'Dead Stock Value', value: fmt(inventory.deadStockValue),         color: 'text-red-600' },
          ].map(({ label, value, color, plain }) => (
            <div key={label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Business Health Score ── */}
      <section className={`rounded-3xl border p-6 space-y-5 ${healthBg}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Business Health Score</h2>
            <p className="text-xs text-gray-500 mt-0.5">Calculated from 6 real data dimensions</p>
          </div>
          <div className="text-right">
            <span className={`text-4xl font-bold ${healthColor}`}>{health.overallScore}</span>
            <span className="text-gray-400 text-lg">/100</span>
            <p className={`text-sm font-bold ${healthColor} mt-0.5`}>{health.status}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {health.dimensions.map(d => (
            <div key={d.name} className="bg-white/70 rounded-2xl p-4 border border-white/50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-800">{d.name}</p>
                <span className={`text-xs font-bold ${d.status === 'excellent' ? 'text-emerald-600' : d.status === 'healthy' ? 'text-blue-600' : d.status === 'needs_attention' ? 'text-amber-600' : 'text-red-600'}`}>{d.score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${d.status === 'excellent' ? 'bg-emerald-500' : d.status === 'healthy' ? 'bg-blue-500' : d.status === 'needs_attention' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${d.score}%` }} />
              </div>
              <p className="text-[10px] text-gray-500">{d.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Business Insights ── */}
      {insights.length > 0 && (
        <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900">Business Insights</h2>
            <p className="text-xs text-gray-500 mt-0.5">Data-backed recommendations — generated from your actual business data</p>
          </div>
          <div className="space-y-3">
            {insights.map(ins => (
              <div key={ins.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insightPriorityColor(ins.priority)}`}>{ins.priority}</span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">{ins.category}</span>
                  {ins.dataPoint && <span className="text-[10px] font-mono text-gray-400 ml-auto">{ins.dataPoint}</span>}
                </div>
                <p className="text-xs font-bold text-gray-900">{ins.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{ins.message}</p>
                {ins.actionUrl && (
                  <Link href={ins.actionUrl} className="text-[10px] font-semibold text-blue-600 hover:underline">
                    Take action →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Employee / Payroll Analytics ── */}
      <section className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Employee & Payroll Summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">{period.label} · Aggregated only — individual salaries remain private</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Employees</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{payroll.employeeCount}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Total Payroll</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{fmt(payroll.totalPayroll)}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase">Paid</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">{fmt(payroll.paidPayroll)}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-700 uppercase">Pending</p>
            <p className="text-lg font-bold text-amber-700 mt-1">{fmt(payroll.pendingPayroll)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-500 uppercase">Leaves</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{payroll.leaveUsage}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
