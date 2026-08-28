'use client';

import Link from 'next/link';
import {
  ChevronRight,
  Receipt,
  Truck,
  Calendar,
  Package,
  ArrowUpRight,
  ArrowRight,
  Ban,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';
import { CancelPurchaseButton } from '@/components/purchases/cancel-purchase-button';

export type PurchaseItemData = {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  unit: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  lineTotal: number;
  currentStock: number;
};

export type PurchaseDetailData = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  supplier: { id: string; name: string; phone: string | null } | null;
  items: PurchaseItemData[];
};

type BadgeLabel = { labelKey: string; tone: BadgeTone };

function paymentStatusOf(total: number, paid: number): BadgeLabel {
  if (paid >= total && total > 0) return { labelKey: 'purchases.fullyPaid', tone: 'success' };
  if (paid > 0 && paid < total) return { labelKey: 'purchases.partiallyPaid', tone: 'warning' };
  return { labelKey: 'purchases.unpaidFullDue', tone: 'danger' };
}

function purchaseStatusOf(status: string): BadgeLabel {
  if (status === 'CANCELLED') return { labelKey: 'common.cancelled', tone: 'neutral' };
  return { labelKey: 'purchases.received', tone: 'info' };
}

export function PurchaseDetailClient({
  businessId,
  purchase,
  canManage,
}: {
  businessId: string;
  purchase: PurchaseDetailData;
  canManage: boolean;
}) {
  const { language, t, formatCurrency, formatNumber } = useTranslation();

  const total = purchase.total;
  const paid = purchase.paidAmount;
  const discount = purchase.discount;
  const subtotal = purchase.subtotal;
  const remaining = Math.max(0, total - paid);

  const payment = paymentStatusOf(total, paid);
  const purchaseStatus = purchaseStatusOf(purchase.status);
  const isCancelled = purchase.status === 'CANCELLED';

  const invoiceLabel = purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`;

  const purchaseDateLabel = new Date(purchase.purchaseDate).toLocaleDateString(
    language === 'UR' ? 'ur-PK' : 'en-PK',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-4">
        <nav aria-label={t('purchases.breadcrumbAria')}>
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/dashboard/purchases" className="transition-colors hover:text-primary">
                {t('purchases.breadcrumbPurchases')}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 rtl-flip text-gray-400" />
            </li>
            <li aria-current="page" className="font-mono font-medium text-gray-900">
              {invoiceLabel}
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-bold text-gray-900">{invoiceLabel}</h1>
              <Badge tone={purchaseStatus.tone}>{t(purchaseStatus.labelKey)}</Badge>
              <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
              {t('purchases.purchaseDateLabel', { date: purchaseDateLabel })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <CancelPurchaseButton
                businessId={businessId}
                purchaseId={purchase.id}
                invoiceNumber={purchase.invoiceNumber}
                isCancelled={isCancelled}
              />
            ) : (
              isCancelled && (
                <Badge tone="neutral">
                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('purchases.cancelledPurchaseBadge')}
                </Badge>
              )
            )}
          </div>
        </div>

        {isCancelled && (
          <Alert tone="danger" title={t('purchases.cancelledAlertTitle')}>
            {t('purchases.cancelledAlertBody')}
          </Alert>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.grandTotal')}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
            {discount > 0 && (
              <p className="mt-0.5 text-xs text-muted">
                {t('purchases.afterDiscount', { amount: formatCurrency(discount) })}
              </p>
            )}
          </div>
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.paid')}</p>
            <p className={cn('mt-1 text-xl font-bold', paid > 0 ? 'text-success' : 'text-gray-900')}>{formatCurrency(paid)}</p>
            <p className="mt-0.5 text-xs text-muted">{t('purchases.paidToSupplier')}</p>
          </div>
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.remainingBalance')}</p>
            <p className={cn('mt-1 text-xl font-bold', remaining > 0 ? 'text-warning' : 'text-gray-900')}>{formatCurrency(remaining)}</p>
            <p className="mt-0.5 text-xs text-muted">{remaining > 0 ? t('purchases.dueToSupplier') : t('purchases.nothingDue')}</p>
          </div>
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.paymentStatus')}</p>
            <div className="mt-1.5">
              <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted">{t(purchaseStatus.labelKey)}</p>
          </div>
        </div>
      </Card>

      <Card padded>
        <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.supplierVendor')}</p>
            {purchase.supplier ? (
              <div>
                <Link
                  href={`/dashboard/suppliers/${purchase.supplier.id}`}
                  className="inline-flex items-center gap-1.5 text-base font-bold text-gray-900 transition-colors hover:text-primary hover:underline"
                >
                  <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
                  {purchase.supplier.name}
                </Link>
                {purchase.supplier.phone && (
                  <p className="mt-0.5 text-xs text-muted">{purchase.supplier.phone}</p>
                )}
              </div>
            ) : (
              <p className="font-medium text-gray-700 italic">{t('purchases.directCashVendor')}</p>
            )}
          </div>

          <div className="sm:text-end">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{t('purchases.invoiceDetails')}</p>
            <p className="font-mono text-sm font-medium text-gray-900">
              {purchase.invoiceNumber || t('purchases.systemRef', { ref: purchase.id.slice(0, 8) })}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {purchase.items.length === 1
                ? t('purchases.productsPurchasedOne', { count: formatNumber(purchase.items.length) })
                : t('purchases.productsPurchasedMany', { count: formatNumber(purchase.items.length) })}
            </p>
          </div>
        </div>

        {purchase.notes && (
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{t('purchases.notesRemarks')} </span>
            <span className="whitespace-pre-wrap">{purchase.notes}</span>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('purchases.purchasedProducts')}
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {purchase.items.length === 1
              ? t('purchases.productCountOne', { count: formatNumber(purchase.items.length) })
              : t('purchases.productCountMany', { count: formatNumber(purchase.items.length) })}
          </span>
        </div>

        <TableWrap>
          <Table className="min-w-[640px] whitespace-nowrap">
            <TableHead>
              <tr>
                <Th>{t('common.product')}</Th>
                <Th className="text-center">{t('common.quantity')}</Th>
                <Th className="text-end">{t('purchases.unitCost')}</Th>
                <Th className="text-end">{t('common.discount')}</Th>
                <Th className="text-end">{t('purchases.lineTotal')}</Th>
              </tr>
            </TableHead>
            <tbody>
              {purchase.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Link
                      href={`/dashboard/inventory/${item.productId}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-gray-900 transition-colors hover:text-primary hover:underline"
                    >
                      {item.productName}
                      <ArrowUpRight className="h-3.5 w-3.5 rtl-flip text-gray-400" aria-hidden="true" />
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {t('purchases.skuLabel')}: {item.sku || t('purchases.skuNotAvailable')}
                    </p>
                  </Td>
                  <Td className="text-center font-bold text-gray-900">
                    {formatNumber(item.quantity)} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                  </Td>
                  <Td className="text-end font-medium text-gray-900">{formatCurrency(item.purchasePrice)}</Td>
                  <Td className="text-end text-sm text-gray-500">
                    {item.discount > 0 ? formatCurrency(item.discount) : '–'}
                  </Td>
                  <Td className="text-end font-bold text-gray-900">{formatCurrency(item.lineTotal)}</Td>
                </Tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/70 text-sm text-gray-700">
                <td colSpan={4} className="px-4 py-3 text-end font-medium">
                  {t('purchases.subtotalLabel')}:
                </td>
                <td className="px-4 py-3 text-end font-bold text-gray-900">{formatCurrency(subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr className="bg-gray-50/70 text-sm text-success">
                  <td colSpan={4} className="px-4 py-2 text-end font-medium">
                    {t('purchases.invoiceDiscount')}:
                  </td>
                  <td className="px-4 py-2 text-end font-bold">- {formatCurrency(discount)}</td>
                </tr>
              )}
              <tr className="bg-gray-100 text-base text-gray-900">
                <td colSpan={4} className="px-4 py-3.5 text-end font-bold">
                  {t('common.grandTotal')}:
                </td>
                <td className="px-4 py-3.5 text-end font-bold text-primary">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </Table>
        </TableWrap>
      </Card>

      <Card padded>
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Package className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-gray-900">{t('purchases.inventoryStockImpact')}</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchase.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-gray-50/50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                <p className="font-mono text-xs text-muted">
                  {t('purchases.skuLabel')}: {item.sku || '-'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                <div>
                  <p className="text-gray-500">{isCancelled ? t('purchases.reversedStock') : t('purchases.procuredStock')}</p>
                  <p
                    className={cn(
                      'text-sm font-bold',
                      isCancelled ? 'text-gray-400 line-through' : 'text-success',
                    )}
                  >
                    +{formatNumber(item.quantity)} {item.unit}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-gray-500">{t('purchases.currentStock')}</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatNumber(item.currentStock)} {item.unit}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/inventory/${item.productId}`}
                className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t('purchases.viewStockHistory')}
                <ArrowRight className="h-3 w-3 rtl-flip" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
