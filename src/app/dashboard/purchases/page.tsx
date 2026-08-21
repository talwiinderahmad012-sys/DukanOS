import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listPurchases } from '@/services/purchases';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Receipt, 
  DollarSign, 
  TrendingDown, 
  Clock, 
  FileText, 
  ChevronRight,
  Truck
} from 'lucide-react';

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    supplierId?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const { search, supplierId, status, paymentStatus, startDate, endDate } = params;

  const [purchasesData, suppliers] = await Promise.all([
    listPurchases(business.id, {
      search,
      supplierId,
      status,
      paymentStatus,
      startDate,
      endDate,
      page,
      limit: 25,
    }),
    prisma.supplier.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { purchases, summary, totalPages } = purchasesData;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases & Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">
            Procurement, supplier invoices, payments, and stock additions.
          </p>
        </div>
        <Link
          href="/dashboard/purchases/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Purchase
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Purchases</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              Rs. {summary.totalSpend.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{summary.invoiceCount} invoices recorded</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">
              Rs. {summary.totalPaid.toLocaleString()}
            </h3>
            <p className="text-xs text-green-600/80 mt-0.5">Cleared supplier payments</p>
          </div>
          <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining Balance</p>
            <h3 className={`text-2xl font-bold mt-1 ${summary.remainingDue > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              Rs. {summary.remainingDue.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Supplier payables / credit</p>
          </div>
          <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Suppliers</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {suppliers.length}
            </h3>
            <Link href="/dashboard/suppliers" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
              View vendor list &rarr;
            </Link>
          </div>
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by invoice # or supplier..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              name="supplierId"
              defaultValue={supplierId || 'ALL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="paymentStatus"
              defaultValue={paymentStatus || 'ALL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="UNPAID">Unpaid / Due</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={status || 'ALL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All States</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Purchases List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {purchases.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No purchases found</h3>
            <p className="text-gray-500 mb-6">
              Record inventory purchases from vendors to update stock and preserve procurement history.
            </p>
            <Link
              href="/dashboard/purchases/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Purchase
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-6 py-3.5 font-medium">Invoice #</th>
                  <th className="px-6 py-3.5 font-medium">Supplier</th>
                  <th className="px-6 py-3.5 font-medium">Date</th>
                  <th className="px-6 py-3.5 font-medium text-center">Items</th>
                  <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                  <th className="px-6 py-3.5 font-medium text-right">Paid</th>
                  <th className="px-6 py-3.5 font-medium text-right">Remaining</th>
                  <th className="px-6 py-3.5 font-medium text-center">Payment</th>
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
                      <td className="px-6 py-4">
                        {purchase.supplier ? (
                          <Link 
                            href={`/dashboard/suppliers/${purchase.supplier.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {purchase.supplier.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400 italic">Direct / Cash Vendor</span>
                        )}
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
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium gap-0.5"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls if more than 1 page */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/purchases?page=${page - 1}`}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/dashboard/purchases?page=${page + 1}`}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
