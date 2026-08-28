import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { redirect } from 'next/navigation';
import {
  isOutOfStock,
  isLowStock,
  type StockFilter,
} from '@/components/inventory/stock-helpers';
import {
  InventoryPageClient,
  type CategoryOption,
  type InventoryRow,
} from './inventory-page-client';

const PAGE_SIZE = 25;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stock?: string;
    category?: string;
    page?: string;
  }>;
}) {
  const { membership, business } = await getActiveBusiness().catch(() => redirect('/login'));
  const params = await searchParams;

  const q = (params.q ?? '').trim();
  const categoryFilter = params.category || '';
  const stockFilter: StockFilter =
    params.stock === 'IN' || params.stock === 'LOW' || params.stock === 'OUT' ? params.stock : 'ALL';
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const baseWhere: Prisma.ProductWhereInput = {
    businessId: business.id,
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [catalogLite, filteredLite, categories] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id },
      select: { currentStock: true, minStockThreshold: true },
    }),
    prisma.product.findMany({
      where: baseWhere,
      select: { id: true, currentStock: true, minStockThreshold: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.category.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalProducts = catalogLite.length;
  const catalogOut = catalogLite.filter(isOutOfStock).length;
  const catalogLow = catalogLite.filter(isLowStock).length;
  const catalogIn = totalProducts - catalogOut - catalogLow;

  const allScopeCount = filteredLite.length;
  const inScopeCount = filteredLite.filter((p) => !isOutOfStock(p) && !isLowStock(p)).length;
  const lowScopeCount = filteredLite.filter(isLowStock).length;
  const outScopeCount = filteredLite.filter(isOutOfStock).length;

  const filteredIds = (
    stockFilter === 'ALL'
      ? filteredLite
      : filteredLite.filter((p) =>
          stockFilter === 'OUT'
            ? isOutOfStock(p)
            : stockFilter === 'LOW'
              ? isLowStock(p)
              : !isOutOfStock(p) && !isLowStock(p),
        )
  ).map((p) => p.id);

  const total = filteredIds.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageIds = filteredIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const products =
    pageIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: pageIds } },
          include: { category: { select: { name: true } } },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        })
      : [];

  const rows: InventoryRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    unit: product.unit,
    categoryName: product.category?.name ?? null,
    currentStock: product.currentStock,
    minStockThreshold: product.minStockThreshold,
    sellingPrice: Number(product.sellingPrice),
    purchasePrice: Number(product.purchasePrice),
  }));

  const hasFilters = q !== '' || categoryFilter !== '' || stockFilter !== 'ALL';

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <InventoryPageClient
      canManage={canManage}
      rows={rows}
      categories={categoryOptions}
      totalProducts={totalProducts}
      catalogIn={catalogIn}
      catalogLow={catalogLow}
      catalogOut={catalogOut}
      allCount={allScopeCount}
      inCount={inScopeCount}
      lowCount={lowScopeCount}
      outCount={outScopeCount}
      q={q}
      category={categoryFilter}
      stock={stockFilter}
      page={page}
      totalPages={totalPages}
      total={total}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      hasFilters={hasFilters}
    />
  );
}
