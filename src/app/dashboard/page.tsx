import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { generateAdvisorFindings } from '@/services/advisor';
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertCircle, 
  Package, 
  ArrowUpRight,
  Receipt,
  Users,
  ChevronRight,
  Sparkles,
  BarChart3,
  Lightbulb,
  ShieldAlert,
  Store,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const { user, business } = await getActiveBusiness();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    products,
    todaySalesAggregate,
    todayProfitAggregate,
    customerAggregate,
    recentSales,
    advisorData,
  ] = await Promise.all([
    // Inventory stats
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: { currentStock: true, minStockThreshold: true },
    }),
    // Today's Sales
    prisma.sale.aggregate({
      where: {
        businessId: business.id,
        status: 'COMPLETED',
        saleDate: { gte: todayStart },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    // Today's Profit
    prisma.saleItem.aggregate({
      where: {
        sale: {
          businessId: business.id,
          status: 'COMPLETED',
          saleDate: { gte: todayStart },
        },
      },
      _sum: { lineProfit: true },
    }),
    // Total Pending Udhaar
    prisma.customer.aggregate({
      where: { businessId: business.id, isActive: true },
      _sum: { outstanding: true },
      _count: { id: true },
    }),
    // Recent Sales
    prisma.sale.findMany({
      where: { businessId: business.id },
      include: {
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Advisor Intelligence
    generateAdvisorFindings(business.id, business.timezone),
  ]);

  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    if (p.currentStock <= 0) outOfStockCount++;
    else if (p.currentStock <= p.minStockThreshold) lowStockCount++;
  }

  const hasInventoryAlerts = lowStockCount > 0 || outOfStockCount > 0;
  const todaySalesTotal = Number(todaySalesAggregate._sum.total || 0);
  const todaySalesCount = todaySalesAggregate._count.id;
  const todayProfitTotal = Number(todayProfitAggregate._sum.lineProfit || 0);
  const totalUdhaar = Number(customerAggregate._sum.outstanding || 0);

  const { healthScore, findings } = advisorData;
  const topFindings = findings.slice(0, 2);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good day, {user.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Here is what is happening with {business.name} today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4 text-gray-600" />
            Reports
          </Link>
          <Link
            href="/dashboard/pos"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            POS Terminal
          </Link>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Today's Sales</h3>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">Rs. {todaySalesTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{todaySalesCount} orders processed today</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Today's Profit</h3>
            <div className="h-8 w-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">Rs. {todayProfitTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-green-600/80 mt-2">Realized net margin</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Pending Udhaar</h3>
            <div className="h-8 w-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${totalUdhaar > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              Rs. {totalUdhaar.toLocaleString()}
            </span>
          </div>
          <Link href="/dashboard/customers" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            Customer receivables &rarr;
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Business Health</h3>
            <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{healthScore.score}</span>
            <span className="text-xs font-bold text-purple-600 uppercase">/ 100 ({healthScore.grade})</span>
          </div>
          <Link href="/dashboard/advisor" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            View Advisor breakdown &rarr;
          </Link>
        </div>

      </div>

      {/* Business Advisor Recommendations Banner */}
      {topFindings.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-6 rounded-2xl border border-blue-100 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-base">Advisor Recommendations</h3>
            </div>
            <Link href="/dashboard/advisor" className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
              View All {findings.length} Findings &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topFindings.map((finding) => (
              <div key={finding.id} className="p-4 bg-white rounded-xl border border-blue-100 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-xs">{finding.title}</h4>
                  {finding.metric && (
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                      {finding.metric}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">{finding.message}</p>
                <p className="text-[11px] font-semibold text-blue-700 pt-0.5">
                  Action: {finding.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" /> Recent Sales Invoices
            </h3>
            <Link href="/dashboard/sales" className="text-xs text-blue-600 hover:underline font-medium">
              View All Invoices &rarr;
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No sales recorded yet. Use the POS Terminal to start selling.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSales.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between hover:bg-gray-50/50 rounded-lg px-2 transition-colors">
                  <div>
                    <Link href={`/dashboard/sales/${sale.id}`} className="font-mono text-sm font-semibold text-blue-600 hover:underline">
                      {sale.invoiceNumber}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {sale.customer ? sale.customer.name : 'Walk-in'} • {sale.items.length} items • {new Date(sale.saleDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 text-sm">
                      Rs. {Number(sale.total).toLocaleString()}
                    </span>
                    <span className={`block text-xs font-semibold ${sale.status === 'COMPLETED' ? 'text-green-600' : 'text-red-500'}`}>
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Intelligence Quick Links */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Intelligence & Operations</h3>
          <div className="space-y-2.5">
            <Link
              href="/dashboard/reports"
              className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between hover:bg-indigo-100/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-sm font-semibold text-indigo-950 block">Reports Hub</span>
                  <span className="text-[11px] text-indigo-700">Daily, Weekly, Monthly & Annual</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard/growth"
              className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between hover:bg-emerald-100/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-sm font-semibold text-emerald-950 block">Growth Analytics</span>
                  <span className="text-[11px] text-emerald-700">MoM & YoY Performance</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard/monitoring"
              className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between hover:bg-blue-100/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-sm font-semibold text-blue-950 block">Remote Monitoring</span>
                  <span className="text-[11px] text-blue-700">Live Cockpit & Store Status</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard/communications"
              className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between hover:bg-amber-100/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="text-sm font-semibold text-amber-950 block">Communications Hub</span>
                  <span className="text-[11px] text-amber-700">Messages & Broadcasts</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/dashboard/activity"
              className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100/70 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-gray-700" />
                <div>
                  <span className="text-sm font-semibold text-gray-950 block">Activity Center</span>
                  <span className="text-[11px] text-gray-600">Operational Audit Trail</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
