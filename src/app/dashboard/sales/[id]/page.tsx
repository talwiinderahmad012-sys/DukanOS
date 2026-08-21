import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getSaleById } from '@/services/sales';
import { CancelSaleButton } from '@/components/sales/cancel-sale-button';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { 
  ChevronRight, 
  Receipt, 
  User, 
  Calendar, 
  CheckCircle2, 
  Ban, 
  Printer, 
  Package, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { PrintButton } from '@/components/sales/print-button';
import { InvoiceFeedbackButton } from '@/components/feedback/invoice-feedback-button';

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const sale = await getSaleById(business.id, id);
  if (!sale) {
    notFound();
  }

  const total = Number(sale.total);
  const paid = Number(sale.paidAmount);
  const discount = Number(sale.discount);
  const subtotal = Number(sale.subtotal);
  const remaining = Math.max(0, total - paid);

  const totalProfit = sale.items.reduce((acc, item) => acc + Number(item.lineProfit), 0);

  const isPaid = paid >= total && total > 0;
  const isPartial = paid > 0 && paid < total;
  const isCancelled = sale.status === 'CANCELLED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs & Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/sales" className="hover:text-blue-600 transition-colors">
            Sales
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium font-mono">
            {sale.invoiceNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <InvoiceFeedbackButton
            businessId={business.id}
            saleId={sale.id}
            customerId={sale.customerId}
          />
          <CancelSaleButton
            businessId={business.id}
            saleId={sale.id}
            invoiceNumber={sale.invoiceNumber}
            isCancelled={isCancelled}
          />
          <PrintButton />
        </div>
      </div>

      {/* Main Printable Invoice Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">{sale.business.name}</h2>
              {isCancelled && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  CANCELLED
                </span>
              )}
            </div>
            {sale.business.address && (
              <p className="text-xs text-gray-500 mt-1">{sale.business.address}, {sale.business.city}</p>
            )}
            {sale.business.phone && (
              <p className="text-xs text-gray-500">Phone: {sale.business.phone}</p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{sale.invoiceNumber}</h1>
            <p className="text-xs text-gray-500">
              Date: {new Date(sale.saleDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-500 font-medium">Payment: {sale.paymentMethod}</p>
          </div>
        </div>

        {/* Customer & Transaction Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm bg-gray-50/70 p-4 rounded-xl border border-gray-100">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Billed To
            </span>
            {sale.customer ? (
              <div>
                <p className="font-bold text-gray-900 text-base">{sale.customer.name}</p>
                {sale.customer.phone && (
                  <p className="text-xs text-gray-600 mt-0.5">Phone: {sale.customer.phone}</p>
                )}
                {sale.customer.address && (
                  <p className="text-xs text-gray-500">{sale.customer.address}</p>
                )}
              </div>
            ) : (
              <p className="font-medium text-gray-700">Walk-in Cash Customer</p>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Status & Payment
            </span>
            <div>
              {isPaid ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                  Fully Paid
                </span>
              ) : isPartial ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                  Partial Payment
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                  Unpaid (Udhaar)
                </span>
              )}
            </div>
            {remaining > 0 && (
              <p className="text-xs font-bold text-orange-600">
                Customer Balance Due: Rs. {remaining.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 font-medium">Item Description</th>
                <th className="py-3 font-medium text-center">Qty</th>
                <th className="py-3 font-medium text-right">Unit Price</th>
                <th className="py-3 font-medium text-right">Discount</th>
                <th className="py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {sale.items.map((item) => {
                const itemPrice = Number(item.sellingPrice);
                const itemDisc = Number(item.discount);
                const itemTotal = Number(item.lineTotal);

                return (
                  <tr key={item.id}>
                    <td className="py-3.5">
                      <p className="font-semibold text-gray-900">{item.product.name}</p>
                      {item.product.sku && (
                        <p className="text-xs text-gray-400 font-mono">SKU: {item.product.sku}</p>
                      )}
                    </td>
                    <td className="py-3.5 text-center font-medium text-gray-900">
                      {item.quantity} {item.product.unit}
                    </td>
                    <td className="py-3.5 text-right text-gray-700">
                      Rs. {itemPrice.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right text-gray-500 text-xs">
                      {itemDisc > 0 ? `Rs. ${itemDisc.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3.5 text-right font-bold text-gray-900">
                      Rs. {itemTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t text-sm">
                <td colSpan={4} className="py-3 text-right text-gray-600">Subtotal:</td>
                <td className="py-3 text-right font-semibold text-gray-900">
                  Rs. {subtotal.toLocaleString()}
                </td>
              </tr>
              {discount > 0 && (
                <tr className="text-sm text-green-600">
                  <td colSpan={4} className="py-1.5 text-right">Overall Discount:</td>
                  <td className="py-1.5 text-right font-semibold">
                    - Rs. {discount.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr className="border-t text-base font-bold text-gray-900">
                <td colSpan={4} className="py-3 text-right">Grand Total:</td>
                <td className="py-3 text-right text-blue-600">
                  Rs. {total.toLocaleString()}
                </td>
              </tr>
              <tr className="text-sm text-gray-600">
                <td colSpan={4} className="py-1 text-right">Paid Amount:</td>
                <td className="py-1 text-right font-medium text-green-600">
                  Rs. {paid.toLocaleString()}
                </td>
              </tr>
              {remaining > 0 && (
                <tr className="text-sm font-bold text-orange-600 border-t">
                  <td colSpan={4} className="py-2 text-right">Remaining Due (Udhaar):</td>
                  <td className="py-2 text-right">
                    Rs. {remaining.toLocaleString()}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Realized Profit Badge (Visible to Owner/Manager, Hidden on Print) */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Realized Gross Profit on this Sale:</span>
          </div>
          <span className="font-bold text-emerald-900 text-base">
            Rs. {totalProfit.toLocaleString()}
          </span>
        </div>

        {/* Thank You Note */}
        <div className="text-center pt-6 border-t border-gray-100 text-xs text-gray-400 space-y-1">
          <p className="font-medium text-gray-600">Thank you for your business!</p>
          <p>Powered by DukaanOS • Cloud Retail POS</p>
        </div>
      </div>

      {/* Inventory Impact Breakdown (Hidden when printing) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 print:hidden">
        <div className="flex items-center gap-2 border-b pb-3">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">
            Inventory Stock Impact
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sale.items.map((item) => (
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
                  <p className="text-gray-500">Deducted Stock</p>
                  <p className={`font-bold text-sm ${isCancelled ? 'text-gray-400 line-through' : 'text-red-600'}`}>
                    -{item.quantity} {item.product.unit}
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
