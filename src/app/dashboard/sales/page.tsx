import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listSales } from '@/services/sales';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  FileText, 
  ChevronRight,
  ShoppingCart,
  Users
} from 'lucide-react';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    customerId?: string;
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
  const { search, customerId, status, paymentStatus, startDate, endDate } = params;

  const [salesData, customers] = await Promise.all([
    listSales(business.id, {
      search,
      customerId,
      status,
      paymentStatus,
      startDate,
      endDate,
      page,
      limit: 25,
    }),
    prisma.customer.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { sales, summary, totalPages } = salesData;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">
            Customer sales ledger, credit records, receipts, and realized profits.
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <ShoppingCart className="w-5 h-5" />
          Open POS Terminal
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              Rs. {summary.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{summary.invoiceCount} invoices recorded</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Realized Net Profit</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">
              Rs. {summary.totalProfit.toLocaleString()}
            </h3>
            <p className="text-xs text-green-600/80 mt-0.5">After all item/global discounts</p>
          </div>
          <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Udhaar</p>
            <h3 className={`text-2xl font-bold mt-1 ${summary.remainingDue > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              Rs. {summary.remainingDue.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Unpaid customer credit</p>
          </div>
          <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Accounts</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {customers.length}
            </h3>
            <Link href="/dashboard/customers" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
              View customer directory &rarr;
            </Link>
          </div>
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
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
              placeholder="Search by invoice #, customer name or phone..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              name="customerId"
              defaultValue={customerId || 'ALL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Customers</option>
              {customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name}
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
              <option value="UNPAID">Unpaid / Udhaar</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={status || 'ALL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All States</option>
              <option value="COMPLETED">Completed</option>
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

      {/* Sales List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No sales recorded yet</h3>
            <p className="text-gray-500 mb-6">
              Launch the POS Terminal to scan items, process customer purchases, and print receipts.
            </p>
            <Link
              href="/dashboard/pos"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Open POS Terminal
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-6 py-3.5 font-medium">Invoice #</th>
                  <th className="px-6 py-3.5 font-medium">Customer</th>
                  <th className="px-6 py-3.5 font-medium">Date</th>
                  <th className="px-6 py-3.5 font-medium text-center">Items</th>
                  <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                  <th className="px-6 py-3.5 font-medium text-right">Paid</th>
                  <th className="px-6 py-3.5 font-medium text-right">Due / Udhaar</th>
                  <th className="px-6 py-3.5 font-medium text-center">Payment</th>
                  <th className="px-6 py-3.5 font-medium text-center">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => {
                  const total = Number(sale.total);
                  const paid = Number(sale.paidAmount);
                  const remaining = Math.max(0, total - paid);

                  const isPaid = paid >= total && total > 0;
                  const isPartial = paid > 0 && paid < total;
                  const isCancelled = sale.status === 'CANCELLED';

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900">
                        <Link 
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          {sale.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {sale.customer ? (
                          <Link 
                            href={`/dashboard/customers/${sale.customer.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {sale.customer.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400 italic">Walk-in Customer</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sale.saleDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-medium text-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        Rs. {total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 font-medium text-right">
                        Rs. {paid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={remaining > 0 ? 'text-orange-600 font-bold' : 'text-gray-400'}>
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            Completed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
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

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/sales?page=${page - 1}`}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/dashboard/sales?page=${page + 1}`}
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
