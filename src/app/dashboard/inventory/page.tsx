import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { Package, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function InventoryPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));

  const products = await prisma.product.findMany({
    where: { businessId: business.id },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { name: 'asc' }
  });

  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.currentStock <= 0).length;
  const lowStock = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStockThreshold).length;
  const healthy = totalProducts - outOfStock - lowStock;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 text-sm mt-1">Track stock levels and adjustments.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Out of Stock</p>
            <p className="text-2xl font-bold text-gray-900">{outOfStock}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Low Stock</p>
            <p className="text-2xl font-bold text-gray-900">{lowStock}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Healthy Stock</p>
            <p className="text-2xl font-bold text-gray-900">{healthy}</p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium text-right">Current Stock</th>
                <th className="px-6 py-4 font-medium text-right">Min Stock</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">Last Movement</th>
                <th className="px-6 py-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const status = product.currentStock <= 0 ? 'OUT_OF_STOCK' : 
                               product.currentStock <= product.minStockThreshold ? 'LOW_STOCK' : 'IN_STOCK';
                const lastMove = product.movements[0];

                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{product.sku || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{product.currentStock}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">{product.minStockThreshold}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' :
                        status === 'LOW_STOCK' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">
                      {lastMove ? new Date(lastMove.createdAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/dashboard/inventory/${product.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View & Adjust
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
