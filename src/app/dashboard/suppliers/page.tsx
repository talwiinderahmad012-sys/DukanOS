import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma, PurchaseStatus } from '@/generated/prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CheckCircle2,
  Receipt,
  Search,
  SearchX,
  Truck,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { AddSupplierButton } from '@/components/suppliers/supplier-form-dialog';
import { SupplierActions } from '@/components/suppliers/supplier-actions';

const PAGE_SIZE = 25;

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

function buildSuppliersHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/suppliers?${qs}` : '/dashboard/suppliers';
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { membership, business } = await getActiveBusiness().catch(() => redirect('/login'));
  const params = await searchParams;

  const q = (params.q ?? '').trim();
  const statusFilter: StatusFilter =
    params.status === 'ACTIVE' || params.status === 'ARCHIVED' ? params.status : 'ALL';
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const [catalogLite, purchaseAggregates] = await Promise.all([
    prisma.supplier.findMany({
      where: { businessId: business.id },
      select: { id: true, isActive: true },
    }),
    prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        businessId: business.id,
        supplierId: { not: null },
        status: { not: PurchaseStatus.CANCELLED },
      },
      _count: { _all: true },
      _sum: { total: true, paidAmount: true },
    }),
  ]);

  const balancesBySupplier = new Map<
    string,
    { purchaseCount: number; totalSpend: number; balance: number }
  >();
  for (const agg of purchaseAggregates) {
    const supplierId = agg.supplierId;
    if (!supplierId) continue;
    const totalSpend = Number(agg._sum.total ?? 0);
    const totalPaid = Number(agg._sum.paidAmount ?? 0);
    balancesBySupplier.set(supplierId, {
      purchaseCount: agg._count._all,
      totalSpend,
      balance: Math.max(0, totalSpend - totalPaid),
    });
  }

  const totalSuppliers = catalogLite.length;
  const activeSuppliers = catalogLite.filter((s) => s.isActive).length;
  const archivedSuppliers = totalSuppliers - activeSuppliers;
  const suppliersWithPurchases = catalogLite.filter((s) => balancesBySupplier.has(s.id)).length;
  const outstandingTotal = catalogLite.reduce(
    (acc, s) => acc + (balancesBySupplier.get(s.id)?.balance ?? 0),
    0,
  );

  const where: Prisma.SupplierWhereInput = {
    businessId: business.id,
    ...(statusFilter === 'ACTIVE' ? { isActive: true } : {}),
    ...(statusFilter === 'ARCHIVED' ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const hasFilters = q !== '' || statusFilter !== 'ALL';

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: totalSuppliers },
    { key: 'ACTIVE', label: 'Active', count: activeSuppliers },
    { key: 'ARCHIVED', label: 'Archived', count: archivedSuppliers },
  ];

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const paginationParams = { q: q || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your vendors and distributors, and track what you owe them."
        actions={canManage ? <AddSupplierButton businessId={business.id} /> : undefined}
      />

      {/* Supplier summary */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Suppliers</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Truck className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalSuppliers}</p>
              <p className="mt-1 text-xs text-muted">vendors on record</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeSuppliers}</p>
              <p className="mt-1 text-xs text-muted">available for new purchases</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">With Purchases</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{suppliersWithPurchases}</p>
              <p className="mt-1 text-xs text-muted">have purchase history</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Balance Payable</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', outstandingTotal > 0 ? 'text-warning' : 'text-gray-900')}>
                {fmt(outstandingTotal)}
              </p>
              <p className="mt-1 text-xs text-muted">outstanding to suppliers</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Toolbar: search + status tabs */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search suppliers" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by supplier name, phone or email…"
                aria-label="Search suppliers by name, phone or email"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {statusFilter !== 'ALL' && <input type="hidden" name="status" value={statusFilter} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                Search
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/suppliers"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <nav aria-label="Filter by supplier status" className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.key;
                return (
                  <li key={tab.key} className="flex-1 sm:flex-initial">
                    <Link
                      href={buildSuppliersHref({ q: q || undefined, status: tab.key })}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors',
                        active ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-900',
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                          active ? 'bg-primary-soft text-primary' : 'bg-gray-200 text-gray-600',
                        )}
                      >
                        {tab.count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Empty states */}
        {suppliers.length === 0 &&
          (totalSuppliers === 0 ? (
            <EmptyState
              icon={Truck}
              title="No suppliers yet"
              description="Add suppliers to track purchases, invoices and outstanding balances."
              action={canManage ? <AddSupplierButton businessId={business.id} /> : undefined}
            />
          ) : hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No suppliers found"
              description={
                q
                  ? `No suppliers match “${q}”. Try a different search or clear the filters.`
                  : 'No suppliers match the current filters.'
              }
              action={
                <Link href="/dashboard/suppliers" className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Truck}
              title="No suppliers in this state"
              description="No suppliers match the selected status filter."
            />
          ))}

        {/* Desktop / tablet table */}
        {suppliers.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[720px]">
                <TableHead>
                  <tr>
                    <Th>Supplier</Th>
                    <Th className="hidden lg:table-cell">Contact</Th>
                    <Th className="text-right">Purchases</Th>
                    <Th className="hidden lg:table-cell text-right">Total Purchased</Th>
                    <Th className="text-right">Balance</Th>
                    <Th>Status</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {suppliers.map((supplier) => {
                    const stats = balancesBySupplier.get(supplier.id);
                    const purchaseCount = stats?.purchaseCount ?? 0;

                    return (
                      <Tr key={supplier.id}>
                        <Td className="max-w-[240px]">
                          <Link
                            href={`/dashboard/suppliers/${supplier.id}`}
                            className="truncate font-semibold text-gray-900 transition-colors hover:text-primary"
                          >
                            {supplier.name}
                          </Link>
                          {supplier.address && (
                            <p className="truncate text-xs text-muted">{supplier.address}</p>
                          )}
                        </Td>
                        <Td className="hidden max-w-[200px] lg:table-cell">
                          <p className="truncate text-sm text-gray-600">{supplier.phone || '—'}</p>
                          {supplier.email && (
                            <p className="truncate text-xs text-muted">{supplier.email}</p>
                          )}
                        </Td>
                        <Td className="text-right">
                          {purchaseCount > 0 ? (
                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                              {purchaseCount} {purchaseCount === 1 ? 'bill' : 'bills'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">None yet</span>
                          )}
                        </Td>
                        <Td className="hidden text-right font-medium text-gray-900 lg:table-cell">
                          {fmt(stats?.totalSpend ?? 0)}
                        </Td>
                        <Td className="text-right">
                          {(stats?.balance ?? 0) > 0 ? (
                            <span className="font-semibold text-warning">{fmt(stats?.balance ?? 0)}</span>
                          ) : (
                            <span className="text-sm text-muted">Rs. 0</span>
                          )}
                        </Td>
                        <Td>
                          <Badge tone={supplier.isActive ? 'success' : 'neutral'}>
                            {supplier.isActive ? 'Active' : 'Archived'}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          <SupplierActions
                            businessId={business.id}
                            supplier={{
                              id: supplier.id,
                              name: supplier.name,
                              phone: supplier.phone,
                              email: supplier.email,
                              address: supplier.address,
                              notes: supplier.notes,
                              isActive: supplier.isActive,
                            }}
                            purchaseCount={purchaseCount}
                            canManage={canManage}
                            size="sm"
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            {/* Mobile card list */}
            <ul className="divide-y divide-border md:hidden">
              {suppliers.map((supplier) => {
                const stats = balancesBySupplier.get(supplier.id);
                const purchaseCount = stats?.purchaseCount ?? 0;

                return (
                  <li key={supplier.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/suppliers/${supplier.id}`}
                          className="block truncate font-semibold text-gray-900"
                        >
                          {supplier.name}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {[supplier.phone, supplier.email].filter(Boolean).join(' · ') || 'No contact details'}
                        </p>
                      </div>
                      <SupplierActions
                        businessId={business.id}
                        supplier={{
                          id: supplier.id,
                          name: supplier.name,
                          phone: supplier.phone,
                          email: supplier.email,
                          address: supplier.address,
                          notes: supplier.notes,
                          isActive: supplier.isActive,
                        }}
                        purchaseCount={purchaseCount}
                        canManage={canManage}
                        size="lg"
                      />
                    </div>
                    <div className="grid grid-cols-3 items-end gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Bills</p>
                        <p className="text-sm font-bold text-gray-900">{purchaseCount}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Balance</p>
                        <p className={cn('text-sm font-bold', (stats?.balance ?? 0) > 0 ? 'text-warning' : 'text-gray-900')}>
                          {fmt(stats?.balance ?? 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={supplier.isActive ? 'success' : 'neutral'}>
                          {supplier.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {total} suppliers
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildSuppliersHref({ ...paginationParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildSuppliersHref({ ...paginationParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
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
