import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Package,
  PackageX,
  AlertTriangle,
  CheckCircle2,
  Search,
  SearchX,
  Plus,
  ClipboardList,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import {
  isOutOfStock,
  isLowStock,
  stockDisplay,
  type StockFilter,
} from '@/components/inventory/stock-helpers';

const PAGE_SIZE = 25;

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

function buildInventoryHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/inventory?${qs}` : '/dashboard/inventory';
}

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

  const rows = products.map((product) => ({
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

  const stockTabs: { key: StockFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: allScopeCount },
    { key: 'IN', label: 'In Stock', count: inScopeCount },
    { key: 'LOW', label: 'Low Stock', count: lowScopeCount },
    { key: 'OUT', label: 'Out of Stock', count: outScopeCount },
  ];

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const filterParams = {
    q: q || undefined,
    category: categoryFilter || undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track stock levels, thresholds and movements across your catalog."
        actions={
          <>
            <Link href="/dashboard/products" className={buttonClasses('outline', 'sm')}>
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              Product Catalog
            </Link>
            {canManage && (
              <Link href="/dashboard/purchases/new" className={buttonClasses('primary', 'sm')}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Record Purchase
              </Link>
            )}
          </>
        }
      />

      {/* Stock overview */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Items</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalProducts}</p>
              <p className="mt-1 text-xs text-muted">tracked in inventory</p>
            </div>
          </div>

          <Link
            href={buildInventoryHref({ stock: 'IN' })}
            aria-label={`View in-stock items (${catalogIn})`}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">In Stock</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{catalogIn}</p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">above minimum threshold</p>
            </div>
          </Link>

          <Link
            href={buildInventoryHref({ stock: 'LOW' })}
            aria-label={`View low stock items (${catalogLow})`}
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
            href={buildInventoryHref({ stock: 'OUT' })}
            aria-label={`View out of stock items (${catalogOut})`}
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

      {/* Toolbar: search + filter + stock tabs */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search and filter inventory" className="flex flex-col gap-2">
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
                aria-label="Search inventory by product name, SKU or barcode"
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

              {stockFilter !== 'ALL' && <input type="hidden" name="stock" value={stockFilter} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                Apply
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/inventory"
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
                      href={buildInventoryHref({ ...filterParams, stock: tab.key })}
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
        {rows.length === 0 &&
          (hasFilters ? (
            stockFilter === 'OUT' && !q && !categoryFilter ? (
              <EmptyState
                icon={CheckCircle2}
                title="No out-of-stock items"
                description="Every product currently has stock available."
                action={
                  <Link href={buildInventoryHref(filterParams)} className={buttonClasses('outline', 'sm')}>
                    View all inventory
                  </Link>
                }
              />
            ) : stockFilter === 'LOW' && !q && !categoryFilter ? (
              <EmptyState
                icon={CheckCircle2}
                title="No low-stock items"
                description="All products are above their minimum stock threshold."
                action={
                  <Link href={buildInventoryHref(filterParams)} className={buttonClasses('outline', 'sm')}>
                    View all inventory
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="No inventory found"
                description={
                  q
                    ? `No products match “${q}”. Try a different search or clear the filters.`
                    : 'No products match the current filters.'
                }
                action={
                  <Link href="/dashboard/inventory" className={buttonClasses('outline', 'sm')}>
                    Clear filters
                  </Link>
                }
              />
            )
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start tracking inventory and stock movements."
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
        {rows.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[720px]">
                <TableHead>
                  <tr>
                    <Th>Product</Th>
                    <Th className="hidden xl:table-cell">SKU / Barcode</Th>
                    <Th className="hidden lg:table-cell">Category</Th>
                    <Th className="text-right">Current Stock</Th>
                    <Th className="text-right">Min Threshold</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Selling Price</Th>
                    <Th className="hidden lg:table-cell text-right">Cost</Th>
                    <Th className="text-right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {rows.map((product) => {
                    const stock = stockDisplay(product);
                    return (
                      <Tr key={product.id}>
                        <Td className="max-w-[260px]">
                          <Link
                            href={`/dashboard/inventory/${product.id}`}
                            className="block truncate font-semibold text-gray-900 transition-colors hover:text-primary"
                          >
                            {product.name}
                          </Link>
                          <p className="truncate text-xs text-muted">{product.unit} basis</p>
                        </Td>
                        <Td className="hidden xl:table-cell">
                          <p className="font-mono text-xs text-gray-700">{product.sku || '—'}</p>
                          {product.barcode && <p className="font-mono text-xs text-muted">{product.barcode}</p>}
                        </Td>
                        <Td className="hidden lg:table-cell text-sm text-gray-600">
                          {product.categoryName || '—'}
                        </Td>
                        <Td className="text-right">
                          <span className="font-semibold text-gray-900">
                            {product.currentStock} {product.unit}
                          </span>
                        </Td>
                        <Td className="text-right text-sm text-gray-600">
                          {product.minStockThreshold} {product.unit}
                        </Td>
                        <Td>
                          <Badge tone={stock.tone}>{stock.label}</Badge>
                        </Td>
                        <Td className="text-right font-medium text-gray-900">{fmt(product.sellingPrice)}</Td>
                        <Td className="hidden lg:table-cell text-right text-sm text-gray-600">
                          {fmt(product.purchasePrice)}
                        </Td>
                        <Td className="text-right">
                          <Link
                            href={`/dashboard/inventory/${product.id}`}
                            className={buttonClasses('outline', 'sm')}
                            aria-label={`View stock details for ${product.name}`}
                          >
                            View &amp; Adjust
                          </Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>

            {/* Mobile card list */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((product) => {
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
                      <Badge tone={stock.tone}>{stock.label}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-input border border-border bg-gray-50 p-3 text-center">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">In Stock</p>
                        <p className={cn('mt-0.5 text-sm font-bold', stock.tone === 'danger' ? 'text-danger' : stock.tone === 'warning' ? 'text-warning' : 'text-gray-900')}>
                          {product.currentStock} {product.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Min</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-900">
                          {product.minStockThreshold}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Price</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-900">{fmt(product.sellingPrice)}</p>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/inventory/${product.id}`}
                      className={buttonClasses('outline', 'md', 'w-full')}
                      aria-label={`View stock details for ${product.name}`}
                    >
                      View &amp; Adjust Stock
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {total} items
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={buildInventoryHref({ ...filterParams, stock: stockFilter, page: page - 1 })}
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
                      href={buildInventoryHref({ ...filterParams, stock: stockFilter, page: page + 1 })}
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
