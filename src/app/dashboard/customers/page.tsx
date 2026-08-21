import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getCustomersList } from '@/services/customers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Search, 
  DollarSign, 
  Clock, 
  Phone, 
  ChevronRight,
  UserCheck,
  Star,
  Filter
} from 'lucide-react';
import { createCustomerAction } from '@/app/actions/customer.actions';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;
  const search = params.search;
  const status = (params.status || 'ALL') as any;
  const page = Number(params.page) || 1;

  const { customers, summary, pagination } = await getCustomersList(business.id, {
    search,
    status,
    page,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Directory & Credit Khata</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customer profiles, lifetime purchase histories, credit accounts, and feedback.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Customer Accounts</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {summary.totalCustomers}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Registered in your store</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pending Udhaar</p>
            <h3 className={`text-2xl font-bold mt-1 ${summary.totalOutstanding > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              Rs. {summary.totalOutstanding.toLocaleString()}
            </h3>
            <p className="text-xs text-orange-600/80 mt-0.5">Total customer receivables</p>
          </div>
          <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Credit Ratio</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {customers.filter((c) => Number(c.outstanding) > 0).length} / {customers.length}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Customers with pending balance</p>
          </div>
          <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Create Customer Form */}
        <div className="xl:col-span-1">
          <form
            action={async (formData) => {
              'use server';
              await createCustomerAction(business.id, {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address'),
                notes: formData.get('notes'),
              });
            }}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 sticky top-6"
          >
            <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> New Customer Profile
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
              <input required name="name" type="text" placeholder="e.g. Tariq Mehmood" className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input name="phone" type="text" placeholder="0300-1234567" className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email (Optional)</label>
              <input name="email" type="email" placeholder="customer@example.com" className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
              <textarea name="address" rows={2} placeholder="Shop / Home address" className="w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs"></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-xs shadow-xs">
              Save Customer
            </button>
          </form>
        </div>

        {/* Customers List Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-3">
            <form method="GET" className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search || ''}
                  placeholder="Search customers by name, phone, or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                name="status"
                defaultValue={status}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
              >
                Filter
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {customers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">No customers found</h3>
                <p className="text-gray-500 text-xs">Add your regular customers to maintain credit accounts, purchase insights, and feedback.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                      <th className="px-6 py-4 font-medium">Customer</th>
                      <th className="px-6 py-4 font-medium">Phone & Contact</th>
                      <th className="px-6 py-4 font-medium text-center">Purchases</th>
                      <th className="px-6 py-4 font-medium text-right">Outstanding Udhaar</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {customers.map((cust) => {
                      const outstanding = Number(cust.outstanding);

                      return (
                        <tr key={cust.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Link 
                                href={`/dashboard/customers/${cust.id}`}
                                className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-xs"
                              >
                                {cust.name}
                              </Link>
                              {cust.status && cust.status !== 'ACTIVE' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                                  {cust.status}
                                </span>
                              )}
                            </div>
                            {cust.address && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{cust.address}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-600">
                            <div className="font-mono">{cust.phone || '—'}</div>
                            <div className="text-gray-400">{cust.email}</div>
                          </td>
                          <td className="px-6 py-4 text-xs text-center font-medium text-gray-700">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-gray-100">
                              {cust._count.sales} {cust._count.sales === 1 ? 'sale' : 'sales'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {outstanding > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                                Rs. {outstanding.toLocaleString()} Due
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                Cleared (Rs. 0)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-xs">
                            <Link
                              href={`/dashboard/customers/${cust.id}`}
                              className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
                            >
                              Profile & Ledger <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total customers)
                </span>
                <div className="flex gap-1">
                  {pagination.page > 1 && (
                    <Link
                      href={`/dashboard/customers?page=${pagination.page - 1}${search ? `&search=${search}` : ''}`}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                    >
                      Previous
                    </Link>
                  )}
                  {pagination.page < pagination.totalPages && (
                    <Link
                      href={`/dashboard/customers?page=${pagination.page + 1}${search ? `&search=${search}` : ''}`}
                      className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-700 font-medium"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
