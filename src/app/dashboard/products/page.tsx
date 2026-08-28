import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { redirect } from 'next/navigation';
import {
  ProductsPageClient,
  type CategoryOption,
  type ProductListRow,
} from './products-page-client';

const PAGE_SIZE = 25;

type StockFilter = 'ALL' | 'IN' | 'LOW' | 'OUT';
type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

type StockLite = { currentStock: number; minStockThreshold: number };

function isOutOfStock(p: StockLite): boolean {
  return p.currentStock <= 0;
}

function isLowStock(p: StockLite): boolean {
  return p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    stock?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { membership, business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const params = await searchParams;

  const q = (params.q ?? '').trim();
  const categoryFilter = params.category || '';
  const stockFilter: StockFilter =
    params.stock === 'IN' || params.stock === 'LOW' || params.stock === 'OUT' ? params.stock : 'ALL';
  const statusFilter: StatusFilter =
    params.status === 'ACTIVE' || params.status === 'ARCHIVED' ? params.status : 'ALL';
  const requestedPage = Math.max(1, Number(params.page) || 1);

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const baseWhere: Prisma.ProductWhereInput = {
    businessId: business.id,
    ...(statusFilter === 'ACTIVE' ? { isActive: true } : {}),
    ...(statusFilter === 'ARCHIVED' ? { isActive: false } : {}),
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
      select: { currentStock: true, minStockThreshold: true, isActive: true },
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
  const activeCatalog = catalogLite.filter((p) => p.isActive);
  const activeProducts = activeCatalog.length;
  const catalogLow = activeCatalog.filter(isLowStock).length;
  const catalogOut = activeCatalog.filter(isOutOfStock).length;

  const inScopeCount = filteredLite.filter((p) => !isOutOfStock(p) && !isLowStock(p)).length;
  const lowScopeCount = filteredLite.filter(isLowStock).length;
  const outScopeCount = filteredLite.filter(isOutOfStock).length;
  const allScopeCount = filteredLite.length;

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

  const hasFilters = q !== '' || categoryFilter !== '' || stockFilter !== 'ALL' || statusFilter !== 'ALL';

  const serializableProducts: ProductListRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    description: product.description,
    categoryId: product.categoryId,
    unit: product.unit,
    purchasePrice: Number(product.purchasePrice),
    sellingPrice: Number(product.sellingPrice),
    minStockThreshold: product.minStockThreshold,
    currentStock: product.currentStock,
    isActive: product.isActive,
    categoryName: product.category?.name ?? null,
  }));

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <ProductsPageClient
      businessId={business.id}
      canManage={canManage}
      products={serializableProducts}
      categories={categoryOptions}
      totalProducts={totalProducts}
      activeProducts={activeProducts}
      catalogLow={catalogLow}
      catalogOut={catalogOut}
      allCount={allScopeCount}
      inCount={inScopeCount}
      lowCount={lowScopeCount}
      outCount={outScopeCount}
      q={q}
      category={categoryFilter}
      stock={stockFilter}
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
