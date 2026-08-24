import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import {
  getInventoryValuation,
  getLowStockSummary,
  getSlowMovingProducts,
  getDeadStock,
} from '@/services/analytics';
import Link from 'next/link';
import {
  ArrowLeft, Package, AlertTriangle, AlertCircle,
  Layers, Clock
} from 'lucide-react';

function fmt(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }
function fmtN(n: number) { return Math.round(n).toLocaleString(); }

export default async function InventoryAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') redirect('/dashboard');

  const params = await searchParams;
  const preset = params.preset || 'thisMonth';

  const [inventory, lowStock, slowMoving, deadStock] = await Promise.all([
    getInventoryValuation(business.id),
    getLowStockSummary(business.id),
    getSlowMovingProducts(business.id, 30, 20),
    getDeadStock(business.id, 90, 20),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Stock levels, valuation, and movement insights</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Units</p>
          <p className="text-xl font-bold text-gray-900">{fmtN(inventory.totalUnits)}</p>
          <p className="text-[10px] text-gray-400">Across all products</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Total Value</p>
          <p className="text-xl font-bold text-blue-700">{fmt(inventory.totalValue)}</p>
          <p className="text-[10px] text-gray-400">{inventory.valuationMethod}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Dead Stock Value</p>
          <p className="text-xl font-bold text-red-600">{fmt(inventory.deadStockValue)}</p>
          <p className="text-[10px] text-gray-400">90+ days no sales</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Low Stock Value</p>
          <p className="text-xl font-bold text-amber-600">{fmt(inventory.lowStockValue)}</p>
          <p className="text-[10px] text-gray-400">Below threshold</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{lowStock.outOfStock}</p>
          <p className="text-xs font-semibold text-red-600 mt-0.5">Out of Stock</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{lowStock.critical}</p>
          <p className="text-xs font-semibold text-amber-600 mt-0.5">Critical</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{lowStock.low}</p>
          <p className="text-xs font-semibold text-yellow-600 mt-0.5">Low Stock</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{lowStock.healthy}</p>
          <p className="text-xs font-semibold text-emerald-600 mt-0.5">Healthy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-gray-900">Slow-Moving Stock</h2>
          </div>
          {slowMoving.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No slow-moving products detected.</p>
          ) : (
            <div className="space-y-2">
              {slowMoving.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.currentStock} units · {fmt(p.stockValue)} value</p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{p.daysSinceLastSale}d idle</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h2 className="font-bold text-gray-900">Dead Stock</h2>
          </div>
          {deadStock.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No dead stock detected.</p>
          ) : (
            <div className="space-y-2">
              {deadStock.map(p => (
                <div key={p.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.currentStock} units · {fmt(p.inventoryValue)}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{p.daysSinceLastSale}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
