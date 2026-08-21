import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { Plus, Search, Package, MoreVertical } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function ProductsPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  const products = await prisma.product.findMany({
    where: { businessId: business.id },
    include: { category: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your catalog, pricing, and inventory.</p>
        </div>
        <Link 
          href="/dashboard/products/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products by name, SKU, or barcode..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Categories</option>
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products yet</h3>
            <p className="text-gray-500 mb-6">Add your first product to start managing inventory.</p>
            <Link 
              href="/dashboard/products/new" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">Purchase Price</th>
                  <th className="px-6 py-4 font-medium text-right">Selling Price</th>
                  <th className="px-6 py-4 font-medium text-right">Stock</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const profit = Number(product.sellingPrice) - Number(product.purchasePrice);
                  const margin = Number(product.purchasePrice) > 0 
                    ? ((profit / Number(product.purchasePrice)) * 100).toFixed(1)
                    : 100;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.barcode && <div className="text-xs text-gray-500 font-mono mt-1">{product.barcode}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {product.sku || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        Rs. {Number(product.purchasePrice).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        Rs. {Number(product.sellingPrice).toLocaleString()}
                        <div className="text-xs text-green-600 mt-0.5">
                          +{margin}% margin
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.currentStock <= 0 ? 'bg-red-100 text-red-800' :
                          product.currentStock <= product.minStockThreshold ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {product.currentStock} {product.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <button className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
