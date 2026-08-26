import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { listPurchases } from '@/services/purchases';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plus,
  Search,
  SearchX,
  Receipt,
  Banknote,
  Wallet,
  Truck,
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

function paymentStatusOf(total: number, paid: number): { label: string; tone: BadgeTone } {
  if (paid >= total && total > 0) return { label: 'Paid', tone: 'success' };
  if (paid > 0 && paid < total) return { label: 'Partial', tone: 'warning' };
  return { label: 'Unpaid', tone: 'danger' };
}

function purchaseStatusOf(status: string): { label: string; tone: BadgeTone } {
  if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' };
  return { label: 'Received', tone: 'info' };
}

function formatPurchaseDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildPurchasesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/purchases?${qs}` : '/dashboard/purchases';
}

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
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const search = (params.search ?? '').trim();
  const supplierId = params.supplierId || 'ALL';
  const status = params.status || 'ALL';
  const paymentStatus = params.paymentStatus || 'ALL';
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const page = Math.max(1, Number(params.page) || 1);

  const [purchasesData, suppliers] = await Promise.all([
    listPurchases(business.id, {
      search: search || undefined,
      supplierId,
      status,
      paymentStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    prisma.supplier.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const { purchases, summary, totalPages, totalCount } = purchasesData;

  const activeSupplierCount = suppliers.filter((s) => s.isActive).length;

  const hasFilters =
    search !== '' ||
    supplierId !== 'ALL' ||
    status !== 'ALL' ||
    paymentStatus !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const filterParams = {
    search: search || undefined,
    supplierId: supplierId !== 'ALL' ? supplierId : undefined,
    status: status !== 'ALL' ? status : undefined,
    paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const scopeLabel = hasFilters ? 'within the current filters' : 'across all purchase invoices';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases & Invoices"
        description="Procurement, supplier invoices, payments, and stock additions."
        actions={
          canManage ? (
            <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'md')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Purchase
            </Link>
          ) : undefined
        }
      />

      {/* Summary KPI cards (real data from the current query scope) */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Purchases</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(summary.totalSpend)}</p>
              <p className="mt-1 text-xs text-muted">
                {summary.invoiceCount} {summary.invoiceCount === 1 ? 'invoice' : 'invoices'} {scopeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Paid</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(summary.totalPaid)}</p>
              <p className="mt-1 text-xs text-muted">cleared supplier payments</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Remaining Balance</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', summary.remainingDue > 0 ? 'text-warning' : 'text-gray-900')}>
                {fmt(summary.remainingDue)}
              </p>
              <p className="mt-1 text-xs text-muted">supplier payables / credit</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active Suppliers</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info" aria-hidden="true">
                <Truck className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeSupplierCount}</p>
              <Link href="/dashboard/suppliers" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
                View vendor list &rarr;
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search and filter purchases" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by invoice #, supplier name or notes…"
                aria-label="Search purchases by invoice number, supplier name or notes"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
              <Select
                name="supplierId"
                defaultValue={supplierId}
                aria-label="Filter by supplier"
                className="xl:w-52"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
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
                <option value="PAID">Fully Paid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Unpaid / Due</option>
              </Select>

              <Select
                name="status"
                defaultValue={status}
                aria-label="Filter by purchase state"
                className="xl:w-44"
              >
                <option value="ALL">All States</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
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
                  href="/dashboard/purchases"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto xl:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Empty states */}
        {purchases.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No matching purchases"
              description={
                search
                  ? `No purchases match “${search}” with the current filters. Try a different search or clear the filters.`
                  : 'No purchases match the current filters.'
              }
              action={
                <Link href={buildPurchasesHref({})} className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No purchases recorded yet"
              description="Record inventory purchases from vendors to update stock and preserve procurement history."
              action={
                canManage ? (
                  <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'sm')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Create First Purchase
                  </Link>
                ) : undefined
              }
            />
          ))}

        {/* Desktop / tablet table */}
        {purchases.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[960px]">
                <TableHead>
                  <tr>
                    <Th>Invoice #</Th>
                    <Th>Supplier</Th>
                    <Th>Date</Th>
                    <Th className="hidden xl:table-cell text-center">Items</Th>
                    <Th className="text-right">Grand Total</Th>
                    <Th className="hidden lg:table-cell text-right">Paid</Th>
                    <Th className="hidden lg:table-cell text-right">Remaining</Th>
                    <Th className="text-center">Payment</Th>
                    <Th className="text-center">Status</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {purchases.map((purchase) => {
                    const total = Number(purchase.total);
                    const paid = Number(purchase.paidAmount);
                    const remaining = Math.max(0, total - paid);
                    const payment = paymentStatusOf(total, paid);
                    const purchaseStatus = purchaseStatusOf(purchase.status);

                    return (
                      <Tr key={purchase.id}>
                        <Td>
                          <Link
                            href={`/dashboard/purchases/${purchase.id}`}
                            className="font-mono text-sm font-semibold text-primary hover:text-primary-hover hover:underline"
                          >
                            {purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`}
                          </Link>
                        </Td>
                        <Td className="max-w-[200px]">
                          {purchase.supplier ? (
                            <Link
                              href={`/dashboard/suppliers/${purchase.supplier.id}`}
                              className="block truncate font-medium text-gray-900 hover:text-primary hover:underline"
                            >
                              {purchase.supplier.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted italic">Direct / Cash Vendor</span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-sm text-gray-600">{formatPurchaseDate(purchase.purchaseDate)}</Td>
                        <Td className="hidden xl:table-cell text-center text-sm text-gray-600">
                          {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
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
                        <Td className="text-center">
                          <Badge tone={payment.tone}>{payment.label}</Badge>
                        </Td>
                        <Td className="text-center">
                          <Badge tone={purchaseStatus.tone}>{purchaseStatus.label}</Badge>
                        </Td>
                        <Td className="text-right">
                          <Link
                            href={`/dashboard/purchases/${purchase.id}`}
                            className={buttonClasses('outline', 'sm')}
                            aria-label={`View purchase ${purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`}`}
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

            {/* Mobile purchase cards */}
            <ul className="divide-y divide-border md:hidden">
              {purchases.map((purchase) => {
                const total = Number(purchase.total);
                const paid = Number(purchase.paidAmount);
                const remaining = Math.max(0, total - paid);
                const payment = paymentStatusOf(total, paid);
                const purchaseStatus = purchaseStatusOf(purchase.status);
                const invoiceLabel = purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`;

                return (
                  <li key={purchase.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/purchases/${purchase.id}`}
                          className="block truncate font-mono text-sm font-semibold text-primary hover:underline"
                        >
                          {invoiceLabel}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatPurchaseDate(purchase.purchaseDate)} ·{' '}
                          {purchase.supplier ? purchase.supplier.name : 'Direct / Cash Vendor'}
                        </p>
                      </div>
                      <Badge tone={payment.tone}>{payment.label}</Badge>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted">
                          {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'items'}
                          {remaining > 0 && ` · due ${fmt(remaining)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">{fmt(total)}</p>
                        <p className="text-xs text-muted">paid {fmt(paid)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Badge tone={purchaseStatus.tone}>{purchaseStatus.label}</Badge>
                      <Link
                        href={`/dashboard/purchases/${purchase.id}`}
                        className={buttonClasses('outline', 'sm', 'min-h-10 flex-1 sm:flex-initial')}
                        aria-label={`View purchase ${invoiceLabel}`}
                      >
                        View Invoice
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination (preserves active filters) */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {totalCount} purchases
                </p>
                <nav aria-label="Purchase pages" className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildPurchasesHref({ ...filterParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildPurchasesHref({ ...filterParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
                      Next
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      Next
                    </span>
                  )}
                </nav>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
