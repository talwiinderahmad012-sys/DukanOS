import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getSupplierWithPurchases } from '@/services/suppliers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { 
  ChevronRight, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Plus, 
  FileText 
} from 'lucide-react';

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const data = await getSupplierWithPurchases(business.id, id);
  if (!data) {
    notFound();
  }

  const { supplier, summary, purchases } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/suppliers" className="hover:text-blue-600 transition-colors">
          Suppliers
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-medium">{supplier.name}</span>
      </div>

      {/* Supplier Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                {supplier.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    Active Vendor
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Vendor profile & procurement history</p>
            </div>
          </div>

          <Link
            href={`/dashboard/purchases/new`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Record Purchase
          </Link>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</p>
              <p className="font-medium text-gray-900">{supplier.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
              <p className="font-medium text-gray-900">{supplier.email || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</p>
              <p className="font-medium text-gray-900">{supplier.address || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Notes: </span>
            {supplier.notes}
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Volume</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              Rs. {summary.totalSpend.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{summary.totalPurchases} lifetime invoices</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cleared</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">
              Rs. {summary.totalPaid.toLocaleString()}
            </h3>
            <p className="text-xs text-green-600/80 mt-0.5">Paid to vendor</p>
          </div>
          <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance Due</p>
            <h3 className={`text-2xl font-bold mt-1 ${summary.remainingDue > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              Rs. {summary.remainingDue.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Payable / Credit</p>
          </div>
          <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Purchase</p>
            <h3 className="text-sm font-bold text-gray-900 mt-2">
              {summary.lastPurchaseDate
                ? new Date(summary.lastPurchaseDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'No purchases yet'}
            </h3>
          </div>
          <div className="h-10 w-10 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Supplier Purchase History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Purchase History
          </h2>
          <span className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-700">
            {purchases.length} {purchases.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>

        {purchases.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No purchases have been recorded with this supplier yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-6 py-3.5 font-medium">Invoice #</th>
                  <th className="px-6 py-3.5 font-medium">Date</th>
                  <th className="px-6 py-3.5 font-medium text-center">Items</th>
                  <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                  <th className="px-6 py-3.5 font-medium text-right">Paid</th>
                  <th className="px-6 py-3.5 font-medium text-right">Remaining</th>
                  <th className="px-6 py-3.5 font-medium text-center">Payment Status</th>
                  <th className="px-6 py-3.5 font-medium text-center">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchases.map((purchase) => {
                  const total = Number(purchase.total);
                  const paid = Number(purchase.paidAmount);
                  const remaining = Math.max(0, total - paid);

                  const isPaid = paid >= total && total > 0;
                  const isPartial = paid > 0 && paid < total;
                  const isCancelled = purchase.status === 'CANCELLED';

                  return (
                    <tr key={purchase.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          {purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(purchase.purchaseDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-medium text-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs">
                          {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        Rs. {total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 font-medium text-right">
                        Rs. {paid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={remaining > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                          Rs. {remaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            Paid
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            Received
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details &rarr;
                        </Link>
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
