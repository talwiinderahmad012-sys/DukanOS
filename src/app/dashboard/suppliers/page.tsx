import { requireActiveBusiness } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { Prisma, PurchaseStatus } from '@/generated/prisma/client';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';
import { SuppliersPageClient, type SupplierListRow } from './suppliers-page-client';

const PAGE_SIZE = 25;

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { membership, business } = await requireActiveBusiness();

  if (!canAccessDashboardPath(membership.role, '/dashboard/suppliers')) {
    return <ForbiddenView role={membership.role} />;
  }

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

  const rows: SupplierListRow[] = suppliers.map((supplier) => {
    const stats = balancesBySupplier.get(supplier.id);
    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
      isActive: supplier.isActive,
      purchaseCount: stats?.purchaseCount ?? 0,
      totalSpend: stats?.totalSpend ?? 0,
      balance: stats?.balance ?? 0,
    };
  });

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <SuppliersPageClient
      businessId={business.id}
      canManage={canManage}
      q={q}
      statusFilter={statusFilter}
      page={page}
      totalPages={totalPages}
      total={total}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      totalSuppliers={totalSuppliers}
      activeSuppliers={activeSuppliers}
      archivedSuppliers={archivedSuppliers}
      suppliersWithPurchases={suppliersWithPurchases}
      outstandingTotal={outstandingTotal}
      rows={rows}
    />
  );
}
