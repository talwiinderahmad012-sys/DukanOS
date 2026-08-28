import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { redirect } from 'next/navigation';
import { CategoriesPageClient, type CategoryRow } from './categories-page-client';

const PAGE_SIZE = 25;

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

export default async function CategoriesPage({
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

  const catalogLite = await prisma.category.findMany({
    where: { businessId: business.id },
    select: { isActive: true, _count: { select: { products: true } } },
  });

  const totalCategories = catalogLite.length;
  const activeCategories = catalogLite.filter((c) => c.isActive).length;
  const archivedCategories = totalCategories - activeCategories;
  const withProducts = catalogLite.filter((c) => c._count.products > 0).length;
  const emptyCategories = totalCategories - withProducts;

  const where: Prisma.CategoryWhereInput = {
    businessId: business.id,
    ...(statusFilter === 'ACTIVE' ? { isActive: true } : {}),
    ...(statusFilter === 'ARCHIVED' ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, categories] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const hasFilters = q !== '' || statusFilter !== 'ALL';

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const rows: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
  }));

  return (
    <CategoriesPageClient
      businessId={business.id}
      canManage={canManage}
      categories={rows}
      totalCategories={totalCategories}
      activeCategories={activeCategories}
      archivedCategories={archivedCategories}
      withProducts={withProducts}
      emptyCategories={emptyCategories}
      q={q}
      status={statusFilter}
      page={page}
      totalPages={totalPages}
      total={total}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      hasFilters={hasFilters}
    />
  );
}
