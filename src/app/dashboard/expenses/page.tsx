import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getExpensesAction, createExpenseAction, cancelExpenseAction, getExpenseCategoriesAction } from '@/app/actions/expenses.actions';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronRight,
  XCircle,
  Filter,
} from 'lucide-react';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    branchId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const { search, branchId, category, startDate, endDate } = params;

  const isOwnerOrManager = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const [expensesData, branches, categories] = await Promise.all([
    getExpensesAction({
      search,
      branchId: branchId || undefined,
      category: category || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: 25,
      includeCancelled: false,
    }),
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getExpenseCategoriesAction(),
  ]);

  const { expenses, total, totalPages, summary } = expensesData;
  const expenseCategories = categories.success && Array.isArray(categories.data) ? categories.data : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track operational costs, utilities, rent, and overheads.
          </p>
        </div>
        {isOwnerOrManager && (
          <Link
            href="/dashboard/expenses/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Expense
          </Link>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Expenses</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              Rs. {summary.totalAmount.toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{summary.totalCount} recorded</p>
          </div>
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This Filter</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {expenses.length}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">matching records</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cancelled</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {summary.cancelledCount}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">reversed entries</p>
          </div>
          <div className="h-12 w-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {new Set(expenses.map((e) => e.category)).size}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">unique types</p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search by category or description..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              name="branchId"
              defaultValue={branchId || 'ALL'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start date"
            />
          </div>

          <div>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="End date"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard/expenses"
              className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* Expenses List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No expenses recorded yet</h3>
            <p className="text-gray-500 mb-6">
              Track operational costs to understand your true profitability and optimize spending.
            </p>
            {isOwnerOrManager && (
              <Link
                href="/dashboard/expenses/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Record First Expense
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                  <th className="px-6 py-3.5 font-medium">Date</th>
                  <th className="px-6 py-3.5 font-medium">Category</th>
                  <th className="px-6 py-3.5 font-medium">Branch</th>
                  <th className="px-6 py-3.5 font-medium text-right">Amount</th>
                  <th className="px-6 py-3.5 font-medium">Payment</th>
                  <th className="px-6 py-3.5 font-medium">Description</th>
                  <th className="px-6 py-3.5 font-medium text-center">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => {
                  const isCancelled = !!expense.cancelledAt;

                  return (
                    <tr key={expense.id} className={`hover:bg-gray-50/60 transition-colors ${isCancelled ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {expense.branch?.name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        Rs. {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {expense.paymentMethod.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {expense.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs">
                        {isOwnerOrManager && !isCancelled && (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/expenses/${expense.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </Link>
                            <form action={cancelExpenseAction.bind(null, expense.id)}>
                              <button type="submit" className="text-red-600 hover:underline">
                                Cancel
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} expenses
          </p>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/dashboard/expenses?page=${p}&${new URLSearchParams(params).toString()}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
