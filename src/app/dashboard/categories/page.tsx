import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';
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

const PAGE_SIZE = 25;

type StatusFilter = 'ALL' | 'ACTIVE' | 'ARCHIVED';

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function buildCategoriesHref(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/dashboard/categories?${qs}` : '/dashboard/categories';
}

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

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: totalCategories },
    { key: 'ACTIVE', label: 'Active', count: activeCategories },
    { key: 'ARCHIVED', label: 'Archived', count: archivedCategories },
  ];

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const paginationParams = { q: q || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your products into categories for quick filtering and reporting."
        actions={canManage ? <AddCategoryButton businessId={business.id} /> : undefined}
      />

      {/* Category summary */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Categories</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
                <Layers className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{totalCategories}</p>
              <p className="mt-1 text-xs text-muted">in your catalog</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success" aria-hidden="true">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{activeCategories}</p>
              <p className="mt-1 text-xs text-muted">available for products</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">With Products</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info" aria-hidden="true">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{withProducts}</p>
              <p className="mt-1 text-xs text-muted">have products assigned</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Empty</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500" aria-hidden="true">
                <PackageX className="h-4 w-4" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-gray-900">{emptyCategories}</p>
              <p className="mt-1 text-xs text-muted">no products assigned yet</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Toolbar: search + status tabs */}
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-border p-4">
          <form method="GET" aria-label="Search categories" className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by category name or description…"
                aria-label="Search categories by name or description"
                className={inputClasses(false, 'pl-9')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {statusFilter !== 'ALL' && <input type="hidden" name="status" value={statusFilter} />}

              <button type="submit" className={buttonClasses('secondary', 'md', 'w-full sm:w-auto sm:shrink-0')}>
                Search
              </button>

              {hasFilters && (
                <Link
                  href="/dashboard/categories"
                  className={buttonClasses('ghost', 'md', 'w-full text-danger hover:bg-danger-soft hover:text-danger sm:w-auto sm:shrink-0')}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <nav aria-label="Filter by category status" className="overflow-x-auto">
            <ul className="inline-flex min-w-full items-center gap-1 rounded-input border border-border bg-gray-50 p-1 sm:min-w-0">
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.key;
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

        {/* Empty states */}
        {categories.length === 0 &&
          (totalCategories === 0 ? (
            <EmptyState
              icon={Layers}
              title="No categories yet"
              description="Create your first category to start organizing your products."
              action={canManage ? <AddCategoryButton businessId={business.id} /> : undefined}
            />
          ) : hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="No categories found"
              description={
                q
                  ? `No categories match “${q}”. Try a different search or clear the filters.`
                  : 'No categories match the current filters.'
              }
              action={
                <Link href="/dashboard/categories" className={buttonClasses('outline', 'sm')}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Layers}
              title="No categories in this state"
              description="No categories match the selected status filter."
            />
          ))}

        {/* Desktop / tablet table */}
        {categories.length > 0 && (
          <>
            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHead>
                  <tr>
                    <Th>Category</Th>
                    <Th className="hidden lg:table-cell">Description</Th>
                    <Th className="text-right">Products</Th>
                    <Th>Status</Th>
                    <Th className="hidden xl:table-cell">Created</Th>
                    {canManage && (
                      <Th className="text-right">
                        <span className="sr-only">Actions</span>
                      </Th>
                    )}
                  </tr>
                </TableHead>
                <tbody>
                  {categories.map((category) => (
                    <Tr key={category.id}>
                      <Td className="max-w-[240px]">
                        <p className="truncate font-semibold text-gray-900">{category.name}</p>
                        <p className="truncate text-xs text-muted lg:hidden">
                          {category.description || 'No description'}
                        </p>
                      </Td>
                      <Td className="hidden max-w-[320px] lg:table-cell">
                        <p className="truncate text-sm text-gray-600">{category.description || '—'}</p>
                      </Td>
                      <Td className="text-right">
                        {category._count.products > 0 ? (
                          <span className="font-medium text-gray-900">{category._count.products}</span>
                        ) : (
                          <span className="text-xs text-muted">No products yet</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={category.isActive ? 'success' : 'neutral'}>
                          {category.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </Td>
                      <Td className="hidden whitespace-nowrap text-sm text-gray-600 xl:table-cell">
                        {formatDate(category.createdAt)}
                      </Td>
                      {canManage && (
                        <Td className="text-right">
                          <CategoryActions
                            businessId={business.id}
                            category={{
                              id: category.id,
                              name: category.name,
                              description: category.description,
                              isActive: category.isActive,
                            }}
                            productCount={category._count.products}
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

            {/* Mobile card list */}
            <ul className="divide-y divide-border md:hidden">
              {categories.map((category) => (
                <li key={category.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{category.name}</p>
                      <p className="line-clamp-2 text-xs text-muted">
                        {category.description || 'No description'}
                      </p>
                    </div>
                    {canManage && (
                      <CategoryActions
                        businessId={business.id}
                        category={{
                          id: category.id,
                          name: category.name,
                          description: category.description,
                          isActive: category.isActive,
                        }}
                        productCount={category._count.products}
                        canManage={canManage}
                        size="lg"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">
                      {category._count.products > 0
                        ? `${category._count.products} ${category._count.products === 1 ? 'product' : 'products'} · Created ${formatDate(category.createdAt)}`
                        : `No products yet · Created ${formatDate(category.createdAt)}`}
                    </p>
                    <Badge tone={category.isActive ? 'success' : 'neutral'}>
                      {category.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                <p className="text-xs text-muted">
                  Showing {rangeStart}–{rangeEnd} of {total} categories
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link href={buildCategoriesHref({ ...paginationParams, page: page - 1 })} className={buttonClasses('outline', 'sm')}>
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
                    <Link href={buildCategoriesHref({ ...paginationParams, page: page + 1 })} className={buttonClasses('outline', 'sm')}>
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
