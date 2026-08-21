import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getPurchaseById } from '@/services/purchases';
import { CancelPurchaseButton } from '@/components/purchases/cancel-purchase-button';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { 
  ChevronRight, 
  Receipt, 
  Truck, 
  Calendar, 
  CheckCircle2, 
  Ban, 
  Package, 
  ArrowUpRight,
  User,
  Layers
} from 'lucide-react';

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const purchase = await getPurchaseById(business.id, id);
  if (!purchase) {
    notFound();
  }

  const total = Number(purchase.total);
  const paid = Number(purchase.paidAmount);
  const discount = Number(purchase.discount);
  const subtotal = Number(purchase.subtotal);
  const remaining = Math.max(0, total - paid);

  const isPaid = paid >= total && total > 0;
  const isPartial = paid > 0 && paid < total;
  const isCancelled = purchase.status === 'CANCELLED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/purchases" className="hover:text-blue-600 transition-colors">
          Purchases
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-medium font-mono">
          {purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`}
        </span>
      </div>

      {/* Main Invoice Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">
                {purchase.invoiceNumber || `Invoice #${purchase.id.slice(0, 8)}`}
              </h1>
              {isCancelled ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <Ban className="w-3.5 h-3.5" /> CANCELLED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> RECEIVED
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Purchase Date:{' '}
              {new Date(purchase.purchaseDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CancelPurchaseButton
              businessId={business.id}
              purchaseId={purchase.id}
              invoiceNumber={purchase.invoiceNumber}
              isCancelled={isCancelled}
            />
          </div>
        </div>

        {/* Vendor & Financial Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Supplier / Vendor
            </p>
            {purchase.supplier ? (
              <div>
                <Link
                  href={`/dashboard/suppliers/${purchase.supplier.id}`}
                  className="font-bold text-gray-900 text-base hover:text-blue-600 inline-flex items-center gap-1"
                >
                  <Truck className="w-4 h-4 text-blue-600" />
                  {purchase.supplier.name}
                </Link>
                {purchase.supplier.phone && (
                  <p className="text-xs text-gray-500 mt-0.5">{purchase.supplier.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 italic text-sm">Direct / Cash Vendor</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-gray-900">
              Rs. {total.toLocaleString()}
            </p>
            {discount > 0 && (
              <p className="text-xs text-green-600 font-medium">
                Includes Rs. {discount.toLocaleString()} discount
              </p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Payment Status
            </p>
            <div>
              {isPaid ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  Fully Paid
                </span>
              ) : isPartial ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                  Partially Paid
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                  Unpaid (Full Due)
                </span>
              )}
              <p className="text-xs text-gray-500 mt-1">Paid: Rs. {paid.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Remaining Balance
            </p>
            <p className={`text-2xl font-bold ${remaining > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              Rs. {remaining.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Due to supplier</p>
          </div>
        </div>

        {purchase.notes && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Notes / Remarks: </span>
            <span className="whitespace-pre-wrap">{purchase.notes}</span>
          </div>
        )}
      </div>

      {/* Purchased Line Items Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Purchased Products
          </h2>
          <span className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-700">
            {purchase.items.length} {purchase.items.length === 1 ? 'Product' : 'Products'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium text-center">Quantity</th>
                <th className="px-6 py-4 font-medium text-right">Unit Cost (PKR)</th>
                <th className="px-6 py-4 font-medium text-right">Discount</th>
                <th className="px-6 py-4 font-medium text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchase.items.map((item) => {
                const itemPrice = Number(item.purchasePrice);
                const itemDiscount = Number(item.discount);
                const itemLineTotal = Number(item.lineTotal);

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/inventory/${item.productId}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1.5"
                      >
                        {item.product.name}
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                      </Link>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        SKU: {item.product.sku || 'N/A'}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-gray-900">
                      {item.quantity} <span className="text-xs font-normal text-gray-500">{item.product.unit}</span>
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      Rs. {itemPrice.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      {itemDiscount > 0 ? `Rs. ${itemDiscount.toLocaleString()}` : '-'}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      Rs. {itemLineTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/70 text-sm font-medium text-gray-700 border-t">
                <td colSpan={4} className="px-6 py-3 text-right">Subtotal:</td>
                <td className="px-6 py-3 text-right font-bold text-gray-900">
                  Rs. {subtotal.toLocaleString()}
                </td>
              </tr>
              {discount > 0 && (
                <tr className="bg-gray-50/70 text-sm font-medium text-green-700">
                  <td colSpan={4} className="px-6 py-2 text-right">Invoice Discount:</td>
                  <td className="px-6 py-2 text-right font-bold">
                    - Rs. {discount.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="bg-gray-100 text-base font-bold text-gray-900 border-t">
                <td colSpan={4} className="px-6 py-3.5 text-right">Grand Total:</td>
                <td className="px-6 py-3.5 text-right text-blue-600">
                  Rs. {total.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Inventory Impact Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">
            Inventory Stock Impact
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchase.items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-3"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.product.name}</p>
                <p className="text-xs text-gray-400 font-mono">SKU: {item.product.sku || '-'}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                <div>
                  <p className="text-gray-500">Procured Stock</p>
                  <p className={`font-bold text-sm ${isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                    +{item.quantity} {item.product.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Current Stock</p>
                  <p className="font-bold text-sm text-gray-900">
                    {item.product.currentStock} {item.product.unit}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/inventory/${item.productId}`}
                className="text-xs text-blue-600 hover:underline font-medium flex items-center justify-end gap-1"
              >
                View Stock History &rarr;
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
