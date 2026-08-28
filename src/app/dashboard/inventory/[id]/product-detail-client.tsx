'use client';

import Link from 'next/link';
import { ChevronRight, Package, Lock, History } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { cn } from '@/components/ui/cn';
import { InventoryAdjustmentForm } from '@/components/products/inventory-adjustment-form';
import { useTranslation } from '@/lib/i18n/language-context';

export type ProductDetailData = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  categoryName: string | null;
  currentStock: number;
  minStockThreshold: number;
  sellingPrice: number;
  purchasePrice: number;
};

export type MovementRow = {
  id: string;
  createdAt: string;
  movementType: string;
  quantity: number;
  previousStock: number;
  resultingStock: number;
  notes: string | null;
  creatorName: string | null;
  referenceHref: string | null;
};

const MOVEMENT_KEYS: Record<string, string> = {
  OPENING: 'inventory.openingStock',
  PURCHASE: 'inventory.movementPurchase',
  SALE: 'inventory.movementSale',
  RETURN: 'inventory.movementReturn',
  ADJUSTMENT: 'inventory.movementAdjustment',
  DAMAGE: 'inventory.movementDamage',
  LOSS: 'inventory.movementLoss',
  TRANSFER: 'inventory.movementTransfer',
};

const MOVEMENT_TONES: Record<string, BadgeTone> = {
  OPENING: 'neutral',
  PURCHASE: 'info',
  SALE: 'primary',
  RETURN: 'warning',
  ADJUSTMENT: 'success',
  DAMAGE: 'danger',
  LOSS: 'danger',
  TRANSFER: 'neutral',
};

function movementLabelKey(type: string, notes: string | null): string {
  if (type === 'RETURN' && notes) {
    if (notes.startsWith('Cancelled Sale')) return 'inventory.movementSaleCancellation';
    if (notes.startsWith('Cancelled Purchase')) return 'inventory.movementPurchaseCancellation';
  }
  return MOVEMENT_KEYS[type] ?? 'common.unknown';
}

function movementTone(type: string, notes: string | null): BadgeTone {
  if (type === 'RETURN' && notes) {
    if (notes.startsWith('Cancelled Sale')) return 'success';
    if (notes.startsWith('Cancelled Purchase')) return 'danger';
  }
  return MOVEMENT_TONES[type] ?? 'neutral';
}

export function ProductDetailClient({
  businessId,
  canManage,
  product,
  movements,
}: {
  businessId: string;
  canManage: boolean;
  product: ProductDetailData;
  movements: MovementRow[];
}) {
  const { language, t, formatCurrency } = useTranslation();

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleString(language === 'UR' ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const stockKey =
    product.currentStock <= 0
      ? 'inventory.outOfStock'
      : product.currentStock <= product.minStockThreshold
        ? 'inventory.lowStock'
        : 'inventory.inStock';
  const stockTone: BadgeTone =
    stockKey === 'inventory.outOfStock'
      ? 'danger'
      : stockKey === 'inventory.lowStock'
        ? 'warning'
        : 'success';

  const overviewItems = [
    { label: t('products.sku'), value: product.sku || t('inventory.notSet'), mono: true },
    { label: t('products.barcode'), value: product.barcode || t('inventory.notSet'), mono: true },
    { label: t('common.category'), value: product.categoryName ?? t('products.uncategorized'), mono: false },
    { label: t('inventory.unit'), value: product.unit, mono: false },
    {
      label: t('inventory.minThreshold'),
      value: `${product.minStockThreshold} ${product.unit}`,
      mono: false,
    },
    { label: t('inventory.sellingPrice'), value: formatCurrency(product.sellingPrice), mono: false },
    { label: t('inventory.cost'), value: formatCurrency(product.purchasePrice), mono: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label={t('inventory.breadcrumb')}>
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li>
            <Link href="/dashboard/inventory" className="transition-colors hover:text-primary">
              {t('inventory.pageTitle')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 rtl-flip text-gray-400" />
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
            <Badge tone={stockTone}>{t(stockKey)}</Badge>
          </span>
        }
        description={t('inventory.detailDescription')}
      />

      {stockKey === 'inventory.outOfStock' && (
        <Alert tone="danger" title={t('inventory.outOfStockAlertTitle')}>
          {t('inventory.outOfStockAlertBody')}
        </Alert>
      )}
      {stockKey === 'inventory.lowStock' && (
        <Alert tone="warning" title={t('inventory.lowStockAlertTitle')}>
          {t('inventory.lowStockAlertBody', {
            currentStock: product.currentStock,
            unit: product.unit,
            min: product.minStockThreshold,
          })}
        </Alert>
      )}

      <Card padded>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                stockTone === 'danger'
                  ? 'bg-danger-soft text-danger'
                  : stockTone === 'warning'
                    ? 'bg-warning-soft text-warning'
                    : 'bg-primary-soft text-primary',
              )}
              aria-hidden="true"
            >
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('inventory.currentStock')}</p>
              <p className="text-3xl font-bold leading-tight text-gray-900">
                {product.currentStock}
                <span className="ms-1.5 text-base font-medium text-muted">{product.unit}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {t('inventory.minimumThresholdLine', { min: product.minStockThreshold, unit: product.unit })}
              </p>
            </div>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5 sm:grid-cols-3 sm:border-s sm:ps-6 sm:pt-0 lg:grid-cols-4">
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
        <div className="lg:col-span-1">
          {canManage ? (
            <InventoryAdjustmentForm
              businessId={businessId}
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
                  <h2 className="text-sm font-semibold text-gray-900">{t('inventory.readOnlyTitle')}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {t('inventory.readOnlyDescription')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <History className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('inventory.movementHistoryTitle')}
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {movements.length === 1
                ? t('inventory.entrySingular', { count: movements.length })
                : t('inventory.entryPlural', { count: movements.length })}
            </span>
          </div>

          {movements.length === 0 ? (
            <EmptyState
              icon={History}
              title={t('inventory.noMovementsYet')}
              description={t('inventory.noMovementsDescription')}
            />
          ) : (
            <>
              <TableWrap className="hidden md:block">
                <Table className="min-w-[640px] whitespace-nowrap">
                  <TableHead>
                    <tr>
                      <Th>{t('common.date')}</Th>
                      <Th>{t('inventory.movement')}</Th>
                      <Th className="text-end">{t('inventory.change')}</Th>
                      <Th className="text-end">{t('inventory.before')}</Th>
                      <Th className="text-end">{t('inventory.after')}</Th>
                      <Th>{t('inventory.referenceNotes')}</Th>
                    </tr>
                  </TableHead>
                  <tbody>
                    {movements.map((movement) => (
                      <Tr key={movement.id}>
                        <Td className="text-xs text-gray-600">
                          {formatDate(movement.createdAt)}
                          {movement.creatorName && (
                            <p className="mt-0.5 text-[11px] text-muted">
                              {t('inventory.byCreator', { creator: movement.creatorName })}
                            </p>
                          )}
                        </Td>
                        <Td>
                          <Badge tone={movementTone(movement.movementType, movement.notes)}>
                            {t(movementLabelKey(movement.movementType, movement.notes))}
                          </Badge>
                        </Td>
                        <Td
                          className={cn(
                            'text-end font-semibold tabular-nums',
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
                        <Td className="text-end text-sm tabular-nums text-gray-600">{movement.previousStock}</Td>
                        <Td className="text-end text-sm font-bold tabular-nums text-gray-900">
                          {movement.resultingStock}
                        </Td>
                        <Td className="max-w-[240px] text-sm text-gray-600">
                          {movement.referenceHref ? (
                            <Link
                              href={movement.referenceHref}
                              className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                            >
                              {movement.notes || t('inventory.viewSourceDocument')}
                            </Link>
                          ) : (
                            <span className="block truncate">{movement.notes || t('common.dash')}</span>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>

              <ul className="divide-y divide-border md:hidden">
                {movements.map((movement) => (
                  <li key={movement.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={movementTone(movement.movementType, movement.notes)}>
                        {t(movementLabelKey(movement.movementType, movement.notes))}
                      </Badge>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          movement.quantity > 0
                            ? 'text-success'
                            : movement.quantity < 0
                              ? 'text-danger'
                              : 'text-gray-900',
                        )}
                      >
                        {movement.quantity > 0 ? '+' : ''}
                        {movement.quantity} {product.unit}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>{formatDate(movement.createdAt)}</span>
                      {movement.creatorName && <span>{t('inventory.byCreator', { creator: movement.creatorName })}</span>}
                    </div>

                    <div className="flex items-center justify-between rounded-input border border-border bg-gray-50 px-3 py-2 text-xs">
                      <span className="font-medium text-muted">{t('common.balance')}</span>
                      <span className="font-medium tabular-nums text-gray-600">
                        {movement.previousStock} → <span className="font-bold text-gray-900">{movement.resultingStock}</span> {product.unit}
                      </span>
                    </div>

                    {(movement.notes || movement.referenceHref) && (
                      <p className="break-words text-xs text-gray-600">
                        {movement.referenceHref ? (
                          <Link
                            href={movement.referenceHref}
                            className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                          >
                            {movement.notes || t('inventory.viewSourceDocument')}
                          </Link>
                        ) : (
                          movement.notes
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
