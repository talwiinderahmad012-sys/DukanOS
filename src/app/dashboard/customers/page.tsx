import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { getCustomersList } from '@/services/customers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  UserCheck,
  Wallet,
  Banknote,
  Search,
  SearchX,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { AddCustomerButton } from '@/components/customers/add-customer-button';
import { CustomerActions, type CustomerActionData } from '@/components/customers/customer-actions';
import { MembershipRole } from '@/generated/prisma/client';

const PAGE_SIZE = 25;

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type StatusFilter = 'ALL' | CustomerStatus;
type UdhaarFilter = 'ALL' | 'HAS_OUTSTANDING';

const STATUS_BADGE: Record<CustomerStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INACTIVE: { label: 'Inactive', tone: 'warning' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

function udhaarBadge(outstanding: number, paymentsCount: number): { label: string; tone: BadgeTone } {
  if (outstanding > 0) return { label: 'Outstanding', tone: 'warning' };
  if (paymentsCount > 0) return { label: 'Settled', tone: 'info' };
  return { label: 'Clear', tone: 'success' };
}

function buildCustomersHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/customers?${qs}` : '/dashboard/customers';
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    udhaar?: string;
    page?: string;
  }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const search = (params.search ?? '').trim();
  const statusFilter: StatusFilter =
    params.status === 'ACTIVE' || params.status === 'INACTIVE' || params.status === 'ARCHIVED'
      ? params.status
      : 'ALL';
  const udhaarFilter: UdhaarFilter = params.udhaar === '1' ? 'HAS_OUTSTANDING' : 'ALL';
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const role = membership.role;
  const canCreate =
    role === MembershipRole.OWNER || role === MembershipRole.MANAGER || role === MembershipRole.CASHIER;
  const canManage = role === MembershipRole.OWNER || role === MembershipRole.MANAGER;

  const scopedWhere = {
    businessId: business.id,
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [scopedTotal, scopedWithUdhaar, activeUdhaarCustomers, collectedAggregate] =
    await Promise.all([
      prisma.customer.count({ where: scopedWhere }),
      prisma.customer.count({ where: { ...scopedWhere, outstanding: { gt: 0 } } }),
      prisma.customer.count({
        where: { businessId: business.id, isActive: true, outstanding: { gt: 0 } },
      }),
      prisma.customerPayment.aggregate({
        where: { businessId: business.id },
        _sum: { amount: true },
      }),
    ]);

  const totalInScope = udhaarFilter === 'HAS_OUTSTANDING' ? scopedWithUdhaar : scopedTotal;
  const totalPages = Math.max(1, Math.ceil(totalInScope / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const { customers, summary } = await getCustomersList(business.id, {
    search,
    status: statusFilter,
    hasOutstanding: udhaarFilter === 'HAS_OUTSTANDING',
    page,
    limit: PAGE_SIZE,
  });

  const totalCollected = Number(collectedAggregate._sum.amount || 0);

  const hasFilters = search !== '' || statusFilter !== 'ALL' || udhaarFilter !== 'ALL';

  const udhaarTabs: { key: UdhaarFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: scopedTotal },
    { key: 'HAS_OUTSTANDING', label: 'Has Udhaar', count: scopedWithUdhaar },
  ];

  const rows: (CustomerActionData & {
    salesCount: number;
    paymentsCount: number;
    lastActivityLabel: string;
  })[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    status: customer.status,
    outstanding: Number(customer.outstanding),
    salesCount: customer._count.sales,
    paymentsCount: customer._count.payments,
    lastActivityLabel: new Date(customer.updatedAt).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }));

  const rangeStart = totalInScope === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalInScope);

  const filterParams = {
    search: search || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    udhaar: udhaarFilter === 'HAS_OUTSTANDING' ? '1' : undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customer profiles, udhaar khata balances and payment recovery."
        actions={canCreate ? <AddCustomerButton businessId={business.id} /> : undefined}
      />

      {/* Customer snapshot */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Customers</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{summary.totalCustomers}</p>
              <p className="mt-1 text-xs text-muted">active accounts in your store</p>
            </div>
          </div>

          <Link
            href={buildCustomersHref({ ...filterParams, udhaar: '1' })}
            aria-label={`View customers with udhaar (${activeUdhaarCustomers})`}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Customers With Udhaar</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <UserCheck className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', activeUdhaarCustomers > 0 ? 'text-warning' : 'text-gray-900')}>
                {activeUdhaarCustomers}
              </p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">have a pending balance</p>
            </div>
          </Link>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Outstanding</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', summary.totalOutstanding > 0 ? 'text-danger' : 'text-gray-900')}>
                {fmt(summary.totalOutstanding)}
              </p>
              <p className="mt-1 text-xs text-muted">udhaar receivable from customers</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Payments Collected</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{fmt(totalCollected)}</p>
              <p className="mt-1 text-xs text-muted">all-time udhaar recoveries</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Toolbar: search + status filter + udhaar tabs */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search and filter customers" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by customer name, phone or email…"
                aria-label="Search customers by name, phone or email"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Select name="status" defaultValue={statusFilter} aria-label="Filter by customer status" className="sm:w-44">
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </Select>

              {udhaarFilter !== 'ALL' && <input type="hidden" name="udhaar" value="1" />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                Apply
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/customers"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <nav aria-label="Filter by udhaar balance" className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {udhaarTabs.map((tab) => {
                const active = udhaarFilter === tab.key;
                return (
                  <li key={tab.key} className="flex-1 sm:flex-initial">
                    <Link
                      href={buildCustomersHref({
                        ...filterParams,
                        udhaar: tab.key === 'HAS_OUTSTANDING' ? '1' : undefined,
                      })}
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
                          tab.key === 'HAS_OUTSTANDING' && tab.count > 0 && !active && 'bg-warning-soft text-warning',
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
        {rows.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No customers found"
              description={
                search
                  ? `No customers match “${search}”. Try a different search or clear the filters.`
                  : 'No customers match the current filters.'
              }
              action={
                <Link href={buildCustomersHref({})} className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Add your regular customers to track their purchases, udhaar khata and payments."
              action={canCreate ? <AddCustomerButton businessId={business.id} /> : undefined}
            />
          ))}

        {/* Desktop / tablet table */}
        {rows.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[900px]">
                <TableHead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Phone</Th>
                    <Th className="text-right">Purchases</Th>
                    <Th className="text-right">Outstanding Udhaar</Th>
                    <Th>Status</Th>
                    <Th className="hidden xl:table-cell">Last Activity</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {rows.map((customer) => {
                    const udhaar = udhaarBadge(customer.outstanding, customer.paymentsCount);
                    const status = STATUS_BADGE[customer.status] ?? STATUS_BADGE.ACTIVE;

                    return (
                      <Tr key={customer.id}>
                        <Td className="max-w-[240px]">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="block truncate font-semibold text-gray-900 hover:text-primary"
                          >
                            {customer.name}
                          </Link>
                          {customer.address && (
                            <p className="truncate text-xs text-muted">{customer.address}</p>
                          )}
                        </Td>
                        <Td>
                          <p className="font-mono text-xs text-gray-700">{customer.phone || '—'}</p>
                          {customer.email && <p className="truncate text-xs text-muted">{customer.email}</p>}
                        </Td>
                        <Td className="text-right">
                          <p className="font-medium text-gray-900">{customer.salesCount}</p>
                          <p className="text-xs text-muted">{customer.salesCount === 1 ? 'sale' : 'sales'}</p>
                        </Td>
                        <Td className="text-right">
                          <p
                            className={cn(
                              'font-semibold',
                              customer.outstanding > 0 ? 'text-warning' : 'text-gray-500',
                            )}
                          >
                            {fmt(customer.outstanding)}
                          </p>
                          <div className="mt-1 flex justify-end">
                            <Badge tone={udhaar.tone}>{udhaar.label}</Badge>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </Td>
                        <Td className="hidden xl:table-cell text-xs text-muted">
                          {customer.lastActivityLabel}
                        </Td>
                        <Td className="text-right">
                          <CustomerActions
                            businessId={business.id}
                            customer={customer}
                            canPay={canCreate}
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
              {rows.map((customer) => {
                const udhaar = udhaarBadge(customer.outstanding, customer.paymentsCount);
                const status = STATUS_BADGE[customer.status] ?? STATUS_BADGE.ACTIVE;

                return (
                  <li key={customer.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="block truncate font-semibold text-gray-900"
                        >
                          {customer.name}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {[customer.phone || 'No phone', status.label].join(' · ')}
                        </p>
                      </div>
                      <CustomerActions
                        businessId={business.id}
                        customer={customer}
                        canPay={canCreate}
                        canManage={canManage}
                        size="lg"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className={cn('text-sm font-bold', customer.outstanding > 0 ? 'text-warning' : 'text-gray-900')}>
                          {fmt(customer.outstanding)}
                        </p>
                        <p className="text-xs text-muted">outstanding udhaar</p>
                      </div>
                      <div className="text-right">
                        <Badge tone={udhaar.tone}>{udhaar.label}</Badge>
                        <p className="mt-1 text-xs text-muted">
                          {customer.salesCount} {customer.salesCount === 1 ? 'sale' : 'sales'} · last{' '}
                          {customer.lastActivityLabel}
                        </p>
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
                  Showing {rangeStart}–{rangeEnd} of {totalInScope} customers
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={buildCustomersHref({ ...filterParams, page: page - 1 })}
                      className={buttonClasses('outline', 'sm')}
                    >
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
                    <Link
                      href={buildCustomersHref({ ...filterParams, page: page + 1 })}
                      className={buttonClasses('outline', 'sm')}
                    >
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
