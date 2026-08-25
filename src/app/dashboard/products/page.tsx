import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Plus,
  Package,
  PackageX,
  Layers,
  Search,
  SearchX,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { ProductActions, type ProductActionData } from '@/components/products/product-actions';

const PAGE_SIZE = 25;

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

type StockFilter = 'ALL' | 'IN' | 'LOW' | 'OUT';
type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

type StockLite = { currentStock: number; minStockThreshold: number };

function isOutOfStock(p: StockLite): boolean {
  return p.currentStock <= 0;
}

function isLowStock(p: StockLite): boolean {
  return p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
}

function stockDisplay(p: StockLite): { label: string; tone: BadgeTone } {
  if (isOutOfStock(p)) return { label: 'Out of Stock', tone: 'danger' };
  if (isLowStock(p)) return { label: 'Low Stock', tone: 'warning' };
  return { label: 'In Stock', tone: 'success' };
}

function buildProductsHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/products?${qs}` : '/dashboard/products';
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

  const stockTabs: { key: StockFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: allScopeCount },
    { key: 'IN', label: 'In Stock', count: inScopeCount },
    { key: 'LOW', label: 'Low Stock', count: lowScopeCount },
    { key: 'OUT', label: 'Out of Stock', count: outScopeCount },
  ];

  const serializableProducts: (ProductActionData & {
    categoryName: string | null;
    isActive: boolean;
    currentStock: number;
  })[] = products.map((product) => ({
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

  const filterParams = {
    q: q || undefined,
    category: categoryFilter || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your products, pricing and stock."
        actions={
          <>
            <Link href="/dashboard/categories" className={buttonClasses('outline', 'sm')}>
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Categories
            </Link>
            {canManage && (
              <Link href="/dashboard/products/new" className={buttonClasses('primary', 'sm')}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Product
              </Link>
            )}
          </>
        }
      />

      {/* Catalog summary */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Products</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalProducts}</p>
              <p className="mt-1 text-xs text-muted">in your catalog</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active Products</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeProducts}</p>
              <p className="mt-1 text-xs text-muted">available for sale</p>
            </div>
          </div>

          <Link
            href={buildProductsHref({ stock: 'LOW' })}
            aria-label={`View low stock products (${catalogLow})`}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Low Stock</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', catalogLow > 0 ? 'text-warning' : 'text-gray-900')}>
                {catalogLow}
              </p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">need restocking soon</p>
            </div>
          </Link>

          <Link
            href={buildProductsHref({ stock: 'OUT' })}
            aria-label={`View out of stock products (${catalogOut})`}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Out of Stock</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <PackageX className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', catalogOut > 0 ? 'text-danger' : 'text-gray-900')}>
                {catalogOut}
              </p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">cannot be sold right now</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Toolbar: search + filters + stock tabs */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search and filter products" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by product name, SKU or barcode…"
                aria-label="Search products by name, SKU or barcode"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Select name="category" defaultValue={categoryFilter} aria-label="Filter by category" className="sm:w-48">
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>

              <Select name="status" defaultValue={statusFilter} aria-label="Filter by status" className="sm:w-44">
                <option value="ALL">Active & Archived</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </Select>

              {stockFilter !== 'ALL' && <input type="hidden" name="stock" value={stockFilter} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                Apply
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/products"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <nav aria-label="Filter by stock status" className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {stockTabs.map((tab) => {
                const active = stockFilter === tab.key;
                return (
                  <li key={tab.key} className="flex-1 sm:flex-initial">
                    <Link
                      href={buildProductsHref({
                        ...filterParams,
                        stock: tab.key,
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
                          tab.key === 'LOW' && tab.count > 0 && !active && 'bg-warning-soft text-warning',
                          tab.key === 'OUT' && tab.count > 0 && !active && 'bg-danger-soft text-danger',
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
        {products.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No products found"
              description={
                q
                  ? `No products match “${q}”. Try a different search or clear the filters.`
                  : 'No products match the current filters.'
              }
              action={
                <Link href={buildProductsHref({})} className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start tracking inventory and sales."
              action={
                canManage ? (
                  <Link href="/dashboard/products/new" className={buttonClasses('primary', 'sm')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add Product
                  </Link>
                ) : undefined
              }
            />
          ))}

        {/* Desktop / tablet table */}
        {products.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHead>
                  <tr>
                    <Th>Product</Th>
                    <Th className="hidden xl:table-cell">SKU / Barcode</Th>
                    <Th className="hidden lg:table-cell">Category</Th>
                    <Th className="text-right">Selling Price</Th>
                    <Th className="hidden lg:table-cell text-right">Cost</Th>
                    <Th className="text-right">Stock</Th>
                    <Th>Status</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {serializableProducts.map((product) => {
                    const profit = product.sellingPrice - product.purchasePrice;
                    const margin =
                      product.purchasePrice > 0
                        ? ((profit / product.purchasePrice) * 100).toFixed(1)
                        : product.sellingPrice > 0
                          ? '100.0'
                          : '0.0';
                    const stock = stockDisplay(product);

                    return (
                      <Tr key={product.id}>
                        <Td className="max-w-[280px]">
                          <p className="truncate font-semibold text-gray-900">{product.name}</p>
                          {product.description && (
                            <p className="truncate text-xs text-muted">{product.description}</p>
                          )}
                        </Td>
                        <Td className="hidden xl:table-cell">
                          <p className="font-mono text-xs text-gray-700">{product.sku || '—'}</p>
                          {product.barcode && <p className="font-mono text-xs text-muted">{product.barcode}</p>}
                        </Td>
                        <Td className="hidden lg:table-cell text-sm text-gray-600">
                          {product.categoryName || '—'}
                        </Td>
                        <Td className="text-right">
                          <p className="font-medium text-gray-900">{fmt(product.sellingPrice)}</p>
                          <p className={cn('text-xs', profit >= 0 ? 'text-success' : 'text-danger')}>
                            {profit >= 0 ? '+' : ''}
                            {margin}% margin
                          </p>
                        </Td>
                        <Td className="hidden lg:table-cell text-right text-sm text-gray-600">
                          {fmt(product.purchasePrice)}
                        </Td>
                        <Td className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <Badge tone={stock.tone}>{stock.label}</Badge>
                            <span className="text-xs text-muted">
                              {product.currentStock} {product.unit}
                              {stock.label === 'Low Stock' && ` · min ${product.minStockThreshold}`}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={product.isActive ? 'success' : 'neutral'}>
                            {product.isActive ? 'Active' : 'Archived'}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          <ProductActions
                            businessId={business.id}
                            product={product}
                            categories={categories}
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
              {serializableProducts.map((product) => {
                const stock = stockDisplay(product);
                return (
                  <li key={product.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{product.name}</p>
                        <p className="truncate text-xs text-muted">
                          {[product.categoryName, product.sku].filter(Boolean).join(' · ') || 'Uncategorized'}
                        </p>
                      </div>
                      <ProductActions
                        businessId={business.id}
                        product={product}
                        categories={categories}
                        canManage={canManage}
                        size="lg"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{fmt(product.sellingPrice)}</p>
                        <p className="text-xs text-muted">Cost {fmt(product.purchasePrice)}</p>
                      </div>
                      <div className="text-right">
                        <Badge tone={stock.tone}>{stock.label}</Badge>
                        <p className="mt-1 text-xs text-muted">
                          {product.currentStock} {product.unit}
                          {stock.label === 'Low Stock' && ` · min ${product.minStockThreshold}`}
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
                  Showing {rangeStart}–{rangeEnd} of {total} products
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildProductsHref({ ...filterParams, stock: stockFilter, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildProductsHref({ ...filterParams, stock: stockFilter, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
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
