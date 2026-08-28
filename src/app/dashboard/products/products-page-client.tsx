'use client';

import Link from 'next/link';
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
import { ProductActions } from '@/components/products/product-actions';
import { useTranslation } from '@/lib/i18n/language-context';

export type ProductListRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  currentStock: number;
  isActive: boolean;
  categoryName: string | null;
};

export type CategoryOption = { id: string; name: string };

type StockFilter = 'ALL' | 'IN' | 'LOW' | 'OUT';
type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

function buildProductsHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/products?${qs}` : '/dashboard/products';
}

function stockLabelKey(p: { currentStock: number; minStockThreshold: number }): string {
  if (p.currentStock <= 0) return 'inventory.outOfStock';
  if (p.currentStock <= p.minStockThreshold) return 'inventory.lowStock';
  return 'inventory.inStock';
}

function stockTone(p: { currentStock: number; minStockThreshold: number }): BadgeTone {
  if (p.currentStock <= 0) return 'danger';
  if (p.currentStock <= p.minStockThreshold) return 'warning';
  return 'success';
}

function isLowStock(p: { currentStock: number; minStockThreshold: number }): boolean {
  return p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
}

export function ProductsPageClient({
  businessId,
  canManage,
  products,
  categories,
  totalProducts,
  activeProducts,
  catalogLow,
  catalogOut,
  allCount,
  inCount,
  lowCount,
  outCount,
  q,
  category,
  stock,
  status,
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  hasFilters,
}: {
  businessId: string;
  canManage: boolean;
  products: ProductListRow[];
  categories: CategoryOption[];
  totalProducts: number;
  activeProducts: number;
  catalogLow: number;
  catalogOut: number;
  allCount: number;
  inCount: number;
  lowCount: number;
  outCount: number;
  q: string;
  category: string;
  stock: StockFilter;
  status: StatusFilter;
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  hasFilters: boolean;
}) {
  const { t, formatCurrency } = useTranslation();

  const stockTabs: { key: StockFilter; label: string; count: number }[] = [
    { key: 'ALL', label: t('common.all'), count: allCount },
    { key: 'IN', label: t('inventory.inStock'), count: inCount },
    { key: 'LOW', label: t('inventory.lowStock'), count: lowCount },
    { key: 'OUT', label: t('inventory.outOfStock'), count: outCount },
  ];

  const filterParams = {
    q: q || undefined,
    category: category || undefined,
    status: status !== 'ALL' ? status : undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('common.products')}
        description={t('products.pageDescription')}
        actions={
          <>
            <Link href="/dashboard/categories" className={buttonClasses('outline', 'sm')}>
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {t('common.categories')}
            </Link>
            {canManage && (
              <Link href="/dashboard/products/new" className={buttonClasses('primary', 'sm')}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('products.addProduct')}
              </Link>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('inventory.totalProducts')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalProducts}</p>
              <p className="mt-1 text-xs text-muted">{t('products.inYourCatalog')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('products.activeProducts')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeProducts}</p>
              <p className="mt-1 text-xs text-muted">{t('products.availableForSale')}</p>
            </div>
          </div>

          <Link
            href={buildProductsHref({ stock: 'LOW' })}
            aria-label={t('products.viewLowStockProducts', { count: catalogLow })}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('inventory.lowStock')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning" aria-hidden="true">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', catalogLow > 0 ? 'text-warning' : 'text-gray-900')}>
                {catalogLow}
              </p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">{t('products.needRestockingSoon')}</p>
            </div>
          </Link>

          <Link
            href={buildProductsHref({ stock: 'OUT' })}
            aria-label={t('products.viewOutOfStockProducts', { count: catalogOut })}
            className="group flex flex-col gap-2 bg-surface p-4 transition-colors hover:bg-gray-50 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('inventory.outOfStock')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger" aria-hidden="true">
                <PackageX className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className={cn('text-2xl font-bold leading-tight', catalogOut > 0 ? 'text-danger' : 'text-gray-900')}>
                {catalogOut}
              </p>
              <p className="mt-1 text-xs text-muted group-hover:text-gray-600">{t('products.cannotBeSoldNow')}</p>
            </div>
          </Link>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('products.searchAndFilter')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder={t('products.searchPlaceholder')}
                aria-label={t('products.searchAriaLabel')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Select name="category" defaultValue={category} aria-label={t('products.filterByCategory')} className="sm:w-48">
                <option value="">{t('inventory.allCategories')}</option>
                {categories.map((categoryOption) => (
                  <option key={categoryOption.id} value={categoryOption.id}>
                    {categoryOption.name}
                  </option>
                ))}
              </Select>

              <Select name="status" defaultValue={status} aria-label={t('products.filterByStatus')} className="sm:w-44">
                <option value="ALL">{t('products.activeAndArchived')}</option>
                <option value="ACTIVE">{t('common.active')}</option>
                <option value="ARCHIVED">{t('common.archived')}</option>
              </Select>

              {stock !== 'ALL' && <input type="hidden" name="stock" value={stock} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                {t('common.apply')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/products"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>

          <nav aria-label={t('inventory.filterByStock')} className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {stockTabs.map((tab) => {
                const active = stock === tab.key;
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

        {products.length === 0 &&
          (hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('products.noProductsFound')}
              description={
                q
                  ? t('products.noProductsMatchQuery', { q })
                  : t('products.noProductsMatchFilters')
              }
              action={
                <Link href={buildProductsHref({})} className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title={t('products.noProductsYet')}
              description={t('products.noProductsYetDescription')}
              action={
                canManage ? (
                  <Link href="/dashboard/products/new" className={buttonClasses('primary', 'sm')}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('products.addProduct')}
                  </Link>
                ) : undefined
              }
            />
          ))}

        {products.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHead>
                  <tr>
                    <Th>{t('common.product')}</Th>
                    <Th className="hidden xl:table-cell">{t('products.tableSkuBarcode')}</Th>
                    <Th className="hidden lg:table-cell">{t('common.category')}</Th>
                    <Th className="text-end">{t('products.tableSellingPrice')}</Th>
                    <Th className="hidden lg:table-cell text-end">{t('products.tableCost')}</Th>
                    <Th className="text-end">{t('inventory.tableStock')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th className="text-end">
                      <span className="sr-only">{t('common.actions')}</span>
                    </Th>
                  </tr>
                </TableHead>
                <tbody>
                  {products.map((product) => {
                    const profit = product.sellingPrice - product.purchasePrice;
                    const margin =
                      product.purchasePrice > 0
                        ? ((profit / product.purchasePrice) * 100).toFixed(1)
                        : product.sellingPrice > 0
                          ? '100.0'
                          : '0.0';
                    const low = isLowStock(product);

                    return (
                      <Tr key={product.id}>
                        <Td className="max-w-[280px]">
                          <p className="truncate font-semibold text-gray-900">{product.name}</p>
                          {product.description && (
                            <p className="truncate text-xs text-muted">{product.description}</p>
                          )}
                        </Td>
                        <Td className="hidden xl:table-cell">
                          <p className="font-mono text-xs text-gray-700">{product.sku || t('common.dash')}</p>
                          {product.barcode && <p className="font-mono text-xs text-muted">{product.barcode}</p>}
                        </Td>
                        <Td className="hidden lg:table-cell text-sm text-gray-600">
                          {product.categoryName || t('common.dash')}
                        </Td>
                        <Td className="text-end">
                          <p className="font-medium text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                          <p className={cn('text-xs', profit >= 0 ? 'text-success' : 'text-danger')}>
                            {profit >= 0 ? '+' : ''}
                            {t('products.marginPercent', { margin })}
                          </p>
                        </Td>
                        <Td className="hidden lg:table-cell text-end text-sm text-gray-600">
                          {formatCurrency(product.purchasePrice)}
                        </Td>
                        <Td className="text-end">
                          <div className="flex flex-col items-end gap-1">
                            <Badge tone={stockTone(product)}>{t(stockLabelKey(product))}</Badge>
                            <span className="text-xs text-muted">
                              {product.currentStock} {product.unit}
                              {low && ` · ${t('products.minShort', { min: product.minStockThreshold })}`}
                            </span>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={product.isActive ? 'success' : 'neutral'}>
                            {product.isActive ? t('common.active') : t('common.archived')}
                          </Badge>
                        </Td>
                        <Td className="text-end">
                          <ProductActions
                            businessId={businessId}
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

            <ul className="divide-y divide-border md:hidden">
              {products.map((product) => {
                const low = isLowStock(product);
                return (
                  <li key={product.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{product.name}</p>
                        <p className="truncate text-xs text-muted">
                          {[product.categoryName, product.sku].filter(Boolean).join(' · ') || t('products.uncategorized')}
                        </p>
                      </div>
                      <ProductActions
                        businessId={businessId}
                        product={product}
                        categories={categories}
                        canManage={canManage}
                        size="lg"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                        <p className="text-xs text-muted">{t('products.costLabel', { amount: formatCurrency(product.purchasePrice) })}</p>
                      </div>
                      <div className="text-end">
                        <Badge tone={stockTone(product)}>{t(stockLabelKey(product))}</Badge>
                        <p className="mt-1 text-xs text-muted">
                          {product.currentStock} {product.unit}
                          {low && ` · ${t('products.minShort', { min: product.minStockThreshold })}`}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  {t('common.showingRange', { start: rangeStart, end: rangeEnd, total })}
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildProductsHref({ ...filterParams, stock, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildProductsHref({ ...filterParams, stock, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
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
