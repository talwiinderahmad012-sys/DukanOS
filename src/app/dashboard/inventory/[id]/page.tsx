import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { InventoryAdjustmentForm } from '@/components/products/inventory-adjustment-form';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

export default async function InventoryDetailsPage({ params }: { params: { id: string } }) {
  const { business } = await getActiveBusiness().catch(() => redirect('/login'));

  const product = await prisma.product.findUnique({
    where: { id: params.id, businessId: business.id },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/inventory" className="hover:text-blue-600 transition-colors">Inventory</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">SKU: {product.sku || 'N/A'}</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Current Stock</div>
          <div className="text-2xl font-bold text-blue-600">{product.currentStock} <span className="text-sm font-medium text-gray-500">{product.unit}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Adjustment Form */}
        <div className="lg:col-span-1">
          <InventoryAdjustmentForm 
            businessId={business.id}
            productId={product.id}
            currentStock={product.currentStock}
          />
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Stock Movement History</h3>
          </div>
          
          {product.movements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium text-right">Change</th>
                    <th className="px-6 py-4 font-medium text-right">After Stock</th>
                    <th className="px-6 py-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {product.movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(movement.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          movement.movementType === 'PURCHASE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          movement.movementType === 'RETURN' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {movement.movementType}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${movement.quantity > 0 ? 'text-green-600' : movement.quantity < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {movement.resultingStock}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[240px]">
                        {movement.movementType === 'PURCHASE' && movement.referenceId ? (
                          <Link 
                            href={`/dashboard/purchases/${movement.referenceId}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {movement.notes || 'Purchase Invoice'} &rarr;
                          </Link>
                        ) : (
                          movement.notes || '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
