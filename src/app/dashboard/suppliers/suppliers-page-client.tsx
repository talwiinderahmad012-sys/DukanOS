'use client';

import Link from 'next/link';
import { CheckCircle2, Receipt, Search, SearchX, Truck, Wallet } from 'lucide-react';
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
import { useTranslation } from '@/lib/i18n/language-context';

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

export type SupplierListRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  purchaseCount: number;
  totalSpend: number;
  balance: number;
};

function buildSuppliersHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/suppliers?${qs}` : '/dashboard/suppliers';
}

export function SuppliersPageClient({
  businessId,
  canManage,
  q,
  statusFilter,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  totalSuppliers,
  activeSuppliers,
  archivedSuppliers,
  suppliersWithPurchases,
  outstandingTotal,
  rows,
}: {
  businessId: string;
  canManage: boolean;
  q: string;
  statusFilter: StatusFilter;
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  totalSuppliers: number;
  activeSuppliers: number;
  archivedSuppliers: number;
  suppliersWithPurchases: number;
  outstandingTotal: number;
  rows: SupplierListRow[];
}) {
  const { t, formatCurrency } = useTranslation();

  const hasFilters = q !== '' || statusFilter !== 'ALL';

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: t('common.all'), count: totalSuppliers },
    { key: 'ACTIVE', label: t('common.active'), count: activeSuppliers },
    { key: 'ARCHIVED', label: t('common.archived'), count: archivedSuppliers },
  ];

  const paginationParams = { q: q || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('common.suppliers')}
        description={t('suppliers.pageDescription')}
        actions={canManage ? <AddSupplierButton businessId={businessId} /> : undefined}
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('suppliers.totalSuppliers')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Truck className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalSuppliers}</p>
              <p className="mt-1 text-xs text-muted">{t('suppliers.vendorsOnRecord')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.active')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeSuppliers}</p>
              <p className="mt-1 text-xs text-muted">{t('suppliers.availableForPurchases')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('suppliers.withPurchases')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info" aria-hidden="true">
                <Receipt className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{suppliersWithPurchases}</p>
              <p className="mt-1 text-xs text-muted">{t('suppliers.havePurchaseHistory')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('suppliers.balancePayable')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', outstandingTotal > 0 ? 'text-warning' : 'text-gray-900')}>
                {formatCurrency(outstandingTotal)}
              </p>
              <p className="mt-1 text-xs text-muted">{t('suppliers.outstandingToSuppliers')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('suppliers.searchSuppliers')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder={t('suppliers.searchPlaceholder')}
                aria-label={t('suppliers.searchAriaLabel')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {statusFilter !== 'ALL' && <input type="hidden" name="status" value={statusFilter} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                {t('suppliers.searchButton')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/suppliers"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>

          <nav aria-label={t('suppliers.filterByStatus')} className="overflow-x-auto">
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

        {rows.length === 0 &&
          (totalSuppliers === 0 ? (
            <EmptyState
              icon={Truck}
              title={t('suppliers.noSuppliersYet')}
              description={t('suppliers.noSuppliersYetDescription')}
              action={canManage ? <AddSupplierButton businessId={businessId} /> : undefined}
            />
          ) : hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('suppliers.noSuppliersFound')}
              description={
                q
                  ? t('suppliers.noMatchSearch', { search: q })
                  : t('suppliers.noMatchFilters')
              }
              action={
                <Link href="/dashboard/suppliers" className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Truck}
              title={t('suppliers.noSuppliersInState')}
              description={t('suppliers.noMatchStatusFilter')}
            />
          ))}

        {rows.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[720px]">
                <TableHead>
                  <tr>
                    <Th>{t('common.supplier')}</Th>
                    <Th className="hidden lg:table-cell">{t('suppliers.contact')}</Th>
                    <Th className="text-end">{t('suppliers.tablePurchases')}</Th>
                    <Th className="hidden lg:table-cell text-end">{t('suppliers.totalPurchased')}</Th>
                    <Th className="text-end">{t('common.balance')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('common.actions')}</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {rows.map((supplier) => (
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
                        <p className="truncate text-sm text-gray-600">{supplier.phone || t('common.dash')}</p>
                        {supplier.email && (
                          <p className="truncate text-xs text-muted">{supplier.email}</p>
                        )}
                      </Td>
                      <Td className="text-end">
                        {supplier.purchaseCount > 0 ? (
                          <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                            {supplier.purchaseCount === 1
                              ? t('suppliers.billSingular', { count: supplier.purchaseCount })
                              : t('suppliers.billPlural', { count: supplier.purchaseCount })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">{t('suppliers.noneYet')}</span>
                        )}
                      </Td>
                      <Td className="hidden text-end font-medium text-gray-900 lg:table-cell">
                        {formatCurrency(supplier.totalSpend)}
                      </Td>
                      <Td className="text-end">
                        {supplier.balance > 0 ? (
                          <span className="font-semibold text-warning">{formatCurrency(supplier.balance)}</span>
                        ) : (
                          <span className="text-sm text-muted">{formatCurrency(0)}</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={supplier.isActive ? 'success' : 'neutral'}>
                          {supplier.isActive ? t('common.active') : t('common.archived')}
                        </Badge>
                      </Td>
                      <Td className="text-end">
                        <SupplierActions
                          businessId={businessId}
                          supplier={{
                            id: supplier.id,
                            name: supplier.name,
                            phone: supplier.phone,
                            email: supplier.email,
                            address: supplier.address,
                            notes: supplier.notes,
                            isActive: supplier.isActive,
                          }}
                          purchaseCount={supplier.purchaseCount}
                          canManage={canManage}
                          size="sm"
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-border md:hidden">
              {rows.map((supplier) => (
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
                        {[supplier.phone, supplier.email].filter(Boolean).join(' · ') || t('suppliers.noContactDetails')}
                      </p>
                    </div>
                    <SupplierActions
                      businessId={businessId}
                      supplier={{
                        id: supplier.id,
                        name: supplier.name,
                        phone: supplier.phone,
                        email: supplier.email,
                        address: supplier.address,
                        notes: supplier.notes,
                        isActive: supplier.isActive,
                      }}
                      purchaseCount={supplier.purchaseCount}
                      canManage={canManage}
                      size="lg"
                    />
                  </div>
                  <div className="grid grid-cols-3 items-end gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('suppliers.bills')}</p>
                      <p className="text-sm font-bold text-gray-900">{supplier.purchaseCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.balance')}</p>
                      <p className={cn('text-sm font-bold', supplier.balance > 0 ? 'text-warning' : 'text-gray-900')}>
                        {formatCurrency(supplier.balance)}
                      </p>
                    </div>
                    <div className="text-end">
                      <Badge tone={supplier.isActive ? 'success' : 'neutral'}>
                        {supplier.isActive ? t('common.active') : t('common.archived')}
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  {t('common.showingRange', { start: rangeStart, end: rangeEnd, total })}
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildSuppliersHref({ ...paginationParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.previous')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.previous')}
                    </span>
                  )}
                  <span className="px-1 text-xs font-semibold text-gray-700">
                    {t('common.pageOf', { page, totalPages })}
                  </span>
                  {page < totalPages ? (
                    <Link href={buildSuppliersHref({ ...paginationParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
                      {t('common.next')}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={buttonClasses('outline', 'sm', 'pointer-events-none opacity-50')}>
                      {t('common.next')}
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
