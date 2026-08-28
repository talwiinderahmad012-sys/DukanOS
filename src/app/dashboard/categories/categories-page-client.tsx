'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Layers,
  Package,
  PackageX,
  Search,
  SearchX,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { inputClasses } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { AddCategoryButton } from '@/components/categories/category-form-dialog';
import { CategoryActions } from '@/components/categories/category-actions';
import { useTranslation } from '@/lib/i18n/language-context';
import { getLocalizedValue } from '@/lib/translation/localized';

export type CategoryRow = {
  id: string;
  name: string;
  nameEn: string | null;
  nameUr: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionUr: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

function buildCategoriesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/categories?${qs}` : '/dashboard/categories';
}

export function CategoriesPageClient({
  businessId,
  canManage,
  categories,
  totalCategories,
  activeCategories,
  archivedCategories,
  withProducts,
  emptyCategories,
  q,
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
  categories: CategoryRow[];
  totalCategories: number;
  activeCategories: number;
  archivedCategories: number;
  withProducts: number;
  emptyCategories: number;
  q: string;
  status: StatusFilter;
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  hasFilters: boolean;
}) {
  const { language, t } = useTranslation();

  // Central bilingual display: locale column first, then canonical value,
  // then the other language (never blank while a translation is pending).
  const localizedName = (category: CategoryRow): string =>
    getLocalizedValue(category, 'name', language) ?? category.name;
  const localizedDescription = (category: CategoryRow): string | null =>
    getLocalizedValue(category, 'description', language);

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: t('common.all'), count: totalCategories },
    { key: 'ACTIVE', label: t('common.active'), count: activeCategories },
    { key: 'ARCHIVED', label: t('common.archived'), count: archivedCategories },
  ];

  const paginationParams = { q: q || undefined, status: status !== 'ALL' ? status : undefined };

  const productCountLabel = (count: number): string =>
    count === 1
      ? t('categories.productSingular', { count })
      : t('categories.productPlural', { count });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('common.categories')}
        description={t('categories.pageDescription')}
        actions={canManage ? <AddCategoryButton businessId={businessId} /> : undefined}
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('categories.totalCategories')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalCategories}</p>
              <p className="mt-1 text-xs text-muted">{t('categories.inYourCatalog')}</p>
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
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeCategories}</p>
              <p className="mt-1 text-xs text-muted">{t('categories.availableForProducts')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('categories.withProducts')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info" aria-hidden="true">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{withProducts}</p>
              <p className="mt-1 text-xs text-muted">{t('categories.haveProductsAssigned')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('categories.empty')}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500" aria-hidden="true">
                <PackageX className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{emptyCategories}</p>
              <p className="mt-1 text-xs text-muted">{t('categories.noProductsAssignedYet')}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label={t('categories.searchCategoriesLabel')} className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder={t('categories.searchPlaceholder')}
                aria-label={t('categories.searchAriaLabel')}
                className={inputClasses(false, 'ps-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {status !== 'ALL' && <input type="hidden" name="status" value={status} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                {t('categories.searchButton')}
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/categories"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  {t('common.clear')}
                </Link>
              )}
            </div>
          </form>

          <nav aria-label={t('categories.filterByStatus')} className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {statusTabs.map((tab) => {
                const active = status === tab.key;
                return (
                  <li key={tab.key} className="flex-1 sm:flex-initial">
                    <Link
                      href={buildCategoriesHref({ q: q || undefined, status: tab.key })}
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

        {categories.length === 0 &&
          (totalCategories === 0 ? (
            <EmptyState
              icon={Layers}
              title={t('categories.noCategoriesYet')}
              description={t('categories.noCategoriesYetDescription')}
              action={canManage ? <AddCategoryButton businessId={businessId} /> : undefined}
            />
          ) : hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t('categories.noCategoriesFound')}
              description={
                q
                  ? t('categories.noCategoriesMatchQuery', { q })
                  : t('categories.noCategoriesMatchFilters')
              }
              action={
                <Link href="/dashboard/categories" className={buttonClasses('outline', 'sm')}>
                  {t('common.clearFilters')}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Layers}
              title={t('categories.noCategoriesInState')}
              description={t('categories.noCategoriesInStateDescription')}
            />
          ))}

        {categories.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHead>
                  <tr>
                    <Th>{t('common.category')}</Th>
                    <Th className="hidden lg:table-cell">{t('common.description')}</Th>
                    <Th className="text-end">{t('common.products')}</Th>
                    <Th>{t('common.status')}</Th>
                    <Th className="hidden xl:table-cell">{t('categories.created')}</Th>
                    {canManage && (
                      <Th className="text-end">
                        <span className="sr-only">{t('common.actions')}</span>
                      </Th>
                    )}
                  </tr>
                </TableHead>
                <tbody>
                  {categories.map((category) => (
                    <Tr key={category.id}>
                      <Td className="max-w-[240px]">
                        <p className="truncate font-semibold text-gray-900">{localizedName(category)}</p>
                        <p className="truncate text-xs text-muted lg:hidden">
                          {localizedDescription(category) || t('categories.noDescription')}
                        </p>
                      </Td>
                      <Td className="hidden max-w-[320px] lg:table-cell">
                        <p className="truncate text-sm text-gray-600">{localizedDescription(category) || t('common.dash')}</p>
                      </Td>
                      <Td className="text-end">
                        {category.productCount > 0 ? (
                          <span className="font-medium text-gray-900">{category.productCount}</span>
                        ) : (
                          <span className="text-xs text-muted">{t('categories.noProductsCell')}</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={category.isActive ? 'success' : 'neutral'}>
                          {category.isActive ? t('common.active') : t('common.archived')}
                        </Badge>
                      </Td>
                      <Td className="hidden whitespace-nowrap text-sm text-gray-600 xl:table-cell">
                        {formatDate(category.createdAt)}
                      </Td>
                      {canManage && (
                        <Td className="text-end">
                          <CategoryActions
                            businessId={businessId}
                            category={{
                              id: category.id,
                              name: localizedName(category),
                              description: localizedDescription(category),
                              isActive: category.isActive,
                            }}
                            productCount={category.productCount}
                            canManage={canManage}
                            size="sm"
                          />
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <ul className="divide-y divide-border md:hidden">
              {categories.map((category) => (
                <li key={category.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{localizedName(category)}</p>
                      <p className="line-clamp-2 text-xs text-muted">
                        {localizedDescription(category) || t('categories.noDescription')}
                      </p>
                    </div>
                    {canManage && (
                      <CategoryActions
                        businessId={businessId}
                        category={{
                          id: category.id,
                          name: localizedName(category),
                          description: localizedDescription(category),
                          isActive: category.isActive,
                        }}
                        productCount={category.productCount}
                        canManage={canManage}
                        size="lg"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      {category.productCount > 0
                        ? `${productCountLabel(category.productCount)} · ${t('categories.createdOn', { date: formatDate(category.createdAt) })}`
                        : t('categories.noProductsCreated', { date: formatDate(category.createdAt) })}
                    </p>
                    <Badge tone={category.isActive ? 'success' : 'neutral'}>
                      {category.isActive ? t('common.active') : t('common.archived')}
                    </Badge>
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
                    <Link href={buildCategoriesHref({ ...paginationParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildCategoriesHref({ ...paginationParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
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
