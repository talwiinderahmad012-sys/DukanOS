import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getCustomersList } from '@/services/customers';
import { MembershipRole } from '@/generated/prisma/client';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { CustomersPageClient, type CustomerListRow } from './customers-page-client';

const PAGE_SIZE = 25;

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type UdhaarFilter = 'ALL' | 'HAS_OUTSTANDING';

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
  const { business, membership } = await requireActiveBusiness();

  // Customer/Udhaar ledger is limited to roles with sale-creation rights
  // (OWNER / MANAGER / CASHIER). EMPLOYEE is denied here.
  if (!canAccessDashboardPath(membership.role, '/dashboard/customers')) {
    return <ForbiddenView role={membership.role} />;
  }

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

  const rows: CustomerListRow[] = customers.map((customer) => ({
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
    updatedAt: customer.updatedAt.toISOString(),
  }));

  const rangeStart = totalInScope === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalInScope);

  return (
    <CustomersPageClient
      businessId={business.id}
      canCreate={canCreate}
      canManage={canManage}
      search={search}
      statusFilter={statusFilter}
      udhaarFilter={udhaarFilter}
      page={page}
      totalPages={totalPages}
      totalInScope={totalInScope}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      totalCustomers={summary.totalCustomers}
      totalOutstanding={summary.totalOutstanding}
      activeUdhaarCustomers={activeUdhaarCustomers}
      totalCollected={totalCollected}
      scopedTotal={scopedTotal}
      scopedWithUdhaar={scopedWithUdhaar}
      rows={rows}
    />
  );
}
