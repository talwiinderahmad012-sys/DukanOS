import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { prisma } from '@/lib/db/prisma';
import { InventoryAdjustmentForm } from '@/components/products/inventory-adjustment-form';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Package, Lock, History } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { cn } from '@/components/ui/cn';
import {
  stockDisplay,
  movementDisplay,
  movementReferenceHref,
} from '@/components/inventory/stock-helpers';

export default async function InventoryDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership, business } = await getActiveBusiness().catch(() => redirect('/login'));
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id, businessId: business.id },
    include: {
      category: { select: { name: true } },
      movements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';
  const stock = stockDisplay(product);
  const fmt = (n: number) => `Rs. ${Number(n).toLocaleString()}`;

  const overviewItems = [
    { label: 'SKU', value: product.sku || 'Not set', mono: true },
    { label: 'Barcode', value: product.barcode || 'Not set', mono: true },
    { label: 'Category', value: product.category?.name ?? 'Uncategorized', mono: false },
    { label: 'Unit', value: product.unit, mono: false },
    { label: 'Min Threshold', value: `${product.minStockThreshold} ${product.unit}`, mono: false },
    { label: 'Selling Price', value: fmt(Number(product.sellingPrice)), mono: false },
    { label: 'Cost', value: fmt(Number(product.purchasePrice)), mono: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/inventory" className="transition-colors hover:text-primary">
              Inventory
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </li>
          <li aria-current="page" className="truncate font-medium text-gray-900">
            {product.name}
          </li>
        </ol>
      </nav>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {product.name}
            <Badge tone={stock.tone}>{stock.label}</Badge>
          </span>
        }
        description="Stock position, movement history and manual adjustments."
      />

      {/* Stock attention banners */}
      {stock.label === 'Out of Stock' && (
        <Alert tone="danger" title="This product is out of stock">
          Sales for this product cannot be completed until stock is replenished through a purchase or a manual
          adjustment.
        </Alert>
      )}
      {stock.label === 'Low Stock' && (
        <Alert tone="warning" title="This product is low on stock">
          Current stock ({product.currentStock} {product.unit}) is at or below the minimum threshold (
          {product.minStockThreshold} {product.unit}). Consider restocking soon.
        </Alert>
      )}

      {/* Product & stock overview */}
      <Card padded>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                stock.tone === 'danger'
                  ? 'bg-danger-soft text-danger'
                  : stock.tone === 'warning'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-primary-soft text-primary',
              )}
              aria-hidden="true"
            >
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Current Stock</p>
              <p className="text-3xl font-bold leading-tight text-gray-900">
                {product.currentStock}
                <span className="ml-1.5 text-base font-medium text-muted">{product.unit}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Minimum threshold: {product.minStockThreshold} {product.unit}
              </p>
            </div>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5 sm:grid-cols-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 lg:grid-cols-4">
            {overviewItems.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{item.label}</dt>
                <dd className={cn('truncate text-sm font-medium text-gray-900', item.mono && 'font-mono text-xs')}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stock adjustment */}
        <div className="lg:col-span-1">
          {canManage ? (
            <InventoryAdjustmentForm
              businessId={business.id}
              productId={product.id}
              currentStock={product.currentStock}
              unit={product.unit}
            />
          ) : (
            <Card padded>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500" aria-hidden="true">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Read-only access</h2>
                  <p className="mt-1 text-sm text-muted">
                    Stock adjustments are limited to business owners and managers. You can still review the stock
                    position and movement history.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Stock movement history */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <History className="h-5 w-5 text-primary" aria-hidden="true" />
              Stock Movement History
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {product.movements.length} {product.movements.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {product.movements.length === 0 ? (
            <EmptyState
              icon={History}
              title="No stock movements yet"
              description="Movements are recorded automatically when this product is purchased, sold, returned or manually adjusted."
            />
          ) : (
            <TableWrap>
              <Table className="min-w-[640px] whitespace-nowrap">
                <TableHead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Movement</Th>
                    <Th className="text-right">Change</Th>
                    <Th className="text-right">Before</Th>
                    <Th className="text-right">After</Th>
                    <Th>Reference / Notes</Th>
                  </tr>
                </TableHead>
                <tbody>
                  {product.movements.map((movement) => {
                    const movementLabel = movementDisplay(movement.movementType, movement.notes);
                    const referenceHref = movementReferenceHref(
                      movement.movementType,
                      movement.notes,
                      movement.referenceId,
                    );
                    return (
                      <Tr key={movement.id}>
                        <Td className="text-xs text-gray-600">
                          {new Date(movement.createdAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Td>
                        <Td>
                          <Badge tone={movementLabel.tone}>{movementLabel.label}</Badge>
                        </Td>
                        <Td
                          className={cn(
                            'text-right font-semibold tabular-nums',
                            movement.quantity > 0
                              ? 'text-success'
                              : movement.quantity < 0
                                ? 'text-danger'
                                : 'text-gray-900',
                          )}
                        >
                          {movement.quantity > 0 ? '+' : ''}
                          {movement.quantity}
                        </Td>
                        <Td className="text-right text-sm tabular-nums text-gray-600">{movement.previousStock}</Td>
                        <Td className="text-right text-sm font-bold tabular-nums text-gray-900">
                          {movement.resultingStock}
                        </Td>
                        <Td className="max-w-[240px] text-sm text-gray-600">
                          {referenceHref ? (
                            <Link
                              href={referenceHref}
                              className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                            >
                              {movement.notes || 'View source document'}
                            </Link>
                          ) : (
                            <span className="block truncate">{movement.notes || '—'}</span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
