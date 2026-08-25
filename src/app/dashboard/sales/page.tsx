import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listSales } from '@/services/sales';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Receipt,
  Search,
  SearchX,
  ShoppingCart,
  Banknote,
  TrendingUp,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';

const PAGE_SIZE = 25;

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

type PaymentTone = { label: string; tone: BadgeTone };

function paymentStatusOf(total: number, paid: number): PaymentTone {
  if (paid >= total && total > 0) return { label: 'Paid', tone: 'success' };
  if (paid > 0 && paid < total) return { label: 'Partial', tone: 'warning' };
  return { label: 'Udhaar', tone: 'danger' };
}

function saleStatusOf(status: string): { label: string; tone: BadgeTone } {
  if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' };
  if (status === 'REFUNDED') return { label: 'Refunded', tone: 'info' };
  return { label: 'Completed', tone: 'success' };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  MOBILE_WALLET: 'Mobile Wallet',
  CREDIT: 'Credit (Udhaar)',
};

function formatSaleDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildSalesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/sales?${qs}` : '/dashboard/sales';
}

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

  const search = (params.search ?? '').trim();
  const customerId = params.customerId || 'ALL';
  const status = params.status || 'ALL';
  const paymentStatus = params.paymentStatus || 'ALL';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const page = Math.max(1, Number(params.page) || 1);

  const [salesData, customers] = await Promise.all([
    listSales(business.id, {
      search: search || undefined,
      customerId,
      status,
      paymentStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    prisma.customer.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { sales, summary, totalPages, totalCount } = salesData;

  const hasFilters =
    search !== '' ||
    customerId !== 'ALL' ||
    status !== 'ALL' ||
    paymentStatus !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const filterParams = {
    search: search || undefined,
    customerId: customerId !== 'ALL' ? customerId : undefined,
    status: status !== 'ALL' ? status : undefined,
    paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const scopeLabel = hasFilters ? 'within the current filters' : 'across the full sales ledger';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Customer sales ledger — invoices, payments, credit (Udhaar) and realized profit."
        actions={
          <Link href="/dashboard/pos" className={buttonClasses('primary', 'md')}>
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            New Sale / POS
          </Link>
        }
      />

      {/* Sales summary (real data from the current query scope) */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Sales</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(summary.totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted">
                {summary.invoiceCount} {summary.invoiceCount === 1 ? 'invoice' : 'invoices'} {scopeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Collected</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(summary.totalPaid)}</p>
              <p className="mt-1 text-xs text-muted">payments received {hasFilters ? 'in scope' : 'to date'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding Udhaar</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', summary.remainingDue > 0 ? 'text-warning' : 'text-gray-900')}>
                {fmt(summary.remainingDue)}
              </p>
              <p className="mt-1 text-xs text-muted">unpaid customer credit {scopeLabel}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Realized Profit</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(summary.totalProfit)}</p>
              <p className="mt-1 text-xs text-muted">after item and invoice discounts</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search and filter sales" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by invoice #, customer name or phone…"
                aria-label="Search sales by invoice number, customer name or phone"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="customerId"
                defaultValue={customerId}
                aria-label="Filter by customer"
                className="xl:w-52"
              >
                <option value="ALL">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>

              <Select
                name="paymentStatus"
                defaultValue={paymentStatus}
                aria-label="Filter by payment status"
                className="xl:w-48"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Udhaar (Unpaid)</option>
              </Select>

              <Select
                name="status"
                defaultValue={status}
                aria-label="Filter by sale status"
                className="xl:w-44"
              >
                <option value="ALL">All States</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </Select>

              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                aria-label="From date"
                title="From date"
                className={inputClasses(false, 'xl:w-40')}
              />

              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                aria-label="To date"
                title="To date"
                className={inputClasses(false, 'xl:w-40')}
              />

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto xl:shrink-0')}>
                Apply
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/sales"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Empty states */}
        {sales.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No matching sales"
              description={
                search
                  ? `No sales match “${search}” with the current filters. Try a different search or clear the filters.`
                  : 'No sales match the current filters.'
              }
              action={
                <Link href={buildSalesHref({})} className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No sales recorded yet"
              description="Open the POS terminal to ring up your first sale, take payments and print receipts."
              action={
                <Link href="/dashboard/pos" className={buttonClasses('primary', 'sm')}>
                  <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                  New Sale / POS
                </Link>
              }
            />
          ))}

        {/* Desktop / tablet table */}
        {sales.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[960px]">
                <TableHead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th>Customer</Th>
                    <Th className="hidden xl:table-cell text-center">Items</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="hidden lg:table-cell text-right">Paid</Th>
                    <Th className="hidden lg:table-cell text-right">Due</Th>
                    <Th>Payment</Th>
                    <Th>Status</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {sales.map((sale) => {
                    const total = Number(sale.total);
                    const paid = Number(sale.paidAmount);
                    const remaining = Math.max(0, total - paid);
                    const payment = paymentStatusOf(total, paid);
                    const saleStatus = saleStatusOf(sale.status);

                    return (
                      <Tr key={sale.id}>
                        <Td>
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className="font-mono text-sm font-semibold text-primary hover:text-primary-hover hover:underline"
                          >
                            {sale.invoiceNumber}
                          </Link>
                        </Td>
                        <Td className="whitespace-nowrap text-sm text-gray-600">{formatSaleDate(sale.saleDate)}</Td>
                        <Td className="max-w-[200px]">
                          {sale.customer ? (
                            <Link
                              href={`/dashboard/customers/${sale.customer.id}`}
                              className="block truncate font-medium text-gray-900 hover:text-primary hover:underline"
                            >
                              {sale.customer.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted italic">Walk-in Customer</span>
                          )}
                        </Td>
                        <Td className="hidden xl:table-cell text-center text-sm text-gray-600">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                        </Td>
                        <Td className="text-right">
                          <span className="font-semibold text-gray-900">{fmt(total)}</span>
                        </Td>
                        <Td className="hidden lg:table-cell text-right">
                          <span className={cn('text-sm', paid > 0 ? 'font-medium text-success' : 'text-muted')}>{fmt(paid)}</span>
                        </Td>
                        <Td className="hidden lg:table-cell text-right">
                          <span className={cn('text-sm', remaining > 0 ? 'font-semibold text-warning' : 'text-muted')}>
                            {fmt(remaining)}
                          </span>
                        </Td>
                        <Td>
                          <Badge tone={payment.tone}>{payment.label}</Badge>
                          <p className="mt-0.5 text-xs text-muted">{PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</p>
                        </Td>
                        <Td>
                          <Badge tone={saleStatus.tone}>{saleStatus.label}</Badge>
                        </Td>
                        <Td className="text-right">
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className={buttonClasses('outline', 'sm')}
                            aria-label={`View invoice ${sale.invoiceNumber}`}
                          >
                            View
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            {/* Mobile sale cards */}
            <ul className="divide-y divide-border md:hidden">
              {sales.map((sale) => {
                const total = Number(sale.total);
                const paid = Number(sale.paidAmount);
                const remaining = Math.max(0, total - paid);
                const payment = paymentStatusOf(total, paid);
                const saleStatus = saleStatusOf(sale.status);

                return (
                  <li key={sale.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="block truncate font-mono text-sm font-semibold text-primary hover:underline"
                        >
                          {sale.invoiceNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatSaleDate(sale.saleDate)} · {PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                        </p>
                      </div>
                      <Badge tone={payment.tone}>{payment.label}</Badge>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {sale.customer ? sale.customer.name : 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-muted">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                          {remaining > 0 && ` · due ${fmt(remaining)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">{fmt(total)}</p>
                        <p className="text-xs text-muted">paid {fmt(paid)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Badge tone={saleStatus.tone}>{saleStatus.label}</Badge>
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className={buttonClasses('outline', 'sm', 'min-h-10 flex-1 sm:flex-initial')}
                        aria-label={`View invoice ${sale.invoiceNumber}`}
                      >
                        View Invoice
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {totalCount} sales
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildSalesHref({ ...filterParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
                      Previous
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      Previous
                    </span>
                  )}
                  <span className="px-1 text-xs font-semibold text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link href={buildSalesHref({ ...filterParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
                      Next
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      Next
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
