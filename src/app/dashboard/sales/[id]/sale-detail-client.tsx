'use client';

import Link from 'next/link';
import { ChevronRight, TrendingUp, Package, User, Wallet, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';
import { CancelSaleButton } from '@/components/sales/cancel-sale-button';
import { PrintButton } from '@/components/sales/print-button';
import { InvoiceFeedbackButton } from '@/components/feedback/invoice-feedback-button';

export type SaleItemData = {
  id: string;
  productId: string;
  productName: string;
  sku: string | null;
  unit: string;
  quantity: number;
  sellingPrice: number;
  discount: number;
  lineTotal: number;
  currentStock: number;
};

export type SaleDetailData = {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  status: string;
  paymentMethod: string;
  total: number;
  paidAmount: number;
  discount: number;
  subtotal: number;
  totalProfit: number;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  items: SaleItemData[];
};

type BadgeLabel = { labelKey: string; tone: BadgeTone };

function paymentStatusOf(total: number, paid: number): BadgeLabel {
  if (paid >= total && total > 0) return { labelKey: 'common.paid', tone: 'success' };
  if (paid > 0 && paid < total) return { labelKey: 'sales.payPartial', tone: 'warning' };
  return { labelKey: 'sales.payUdhaar', tone: 'danger' };
}

function saleStatusOf(status: string): BadgeLabel {
  if (status === 'CANCELLED') return { labelKey: 'common.cancelled', tone: 'neutral' };
  if (status === 'REFUNDED') return { labelKey: 'sales.statusRefunded', tone: 'info' };
  return { labelKey: 'common.completed', tone: 'success' };
}

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  CASH: 'sales.payCash',
  CARD: 'sales.payCard',
  BANK_TRANSFER: 'sales.payBankTransfer',
  MOBILE_WALLET: 'sales.payMobileWallet',
  CREDIT: 'sales.payCredit',
};

export function SaleDetailClient({
  businessId,
  sale,
  canViewProfit,
}: {
  businessId: string;
  sale: SaleDetailData;
  canViewProfit: boolean;
}) {
  const { language, t, formatCurrency } = useTranslation();

  const payMethodLabel = (method: string): string => {
    const key = PAYMENT_METHOD_LABEL_KEYS[method] ?? '';
    return key ? t(key) : method;
  };

  const total = sale.total;
  const paid = sale.paidAmount;
  const discount = sale.discount;
  const subtotal = sale.subtotal;
  const remaining = Math.max(0, total - paid);

  const totalProfit = sale.totalProfit;

  const payment = paymentStatusOf(total, paid);
  const saleStatus = saleStatusOf(sale.status);
  const isCancelled = sale.status === 'CANCELLED';

  const saleDateLabel = new Date(sale.saleDate).toLocaleDateString(language === 'UR' ? 'ur-PK' : 'en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-4 print:hidden">
        <nav aria-label={t('sales.breadcrumbAria')} className="flex items-center gap-2 text-sm text-muted">
          <Link href="/dashboard/sales" className="hover:text-primary hover:underline">
            {t('sales.title')}
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400 rtl-flip" aria-hidden="true" />
          <span aria-current="page" className="font-mono font-medium text-gray-900">
            {sale.invoiceNumber}
          </span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{sale.invoiceNumber}</h1>
              <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
              <Badge tone={saleStatus.tone}>{t(saleStatus.labelKey)}</Badge>
            </div>
            <p className="text-sm text-muted">
              {saleDateLabel} ·{' '}
              {sale.customer ? sale.customer.name : t('sales.walkInCustomer')} ·{' '}
              {payMethodLabel(sale.paymentMethod)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InvoiceFeedbackButton businessId={businessId} saleId={sale.id} customerId={sale.customer?.id ?? null} />
            <CancelSaleButton
              businessId={businessId}
              saleId={sale.id}
              invoiceNumber={sale.invoiceNumber}
              isCancelled={isCancelled}
            />
            <PrintButton />
          </div>
        </div>

        {isCancelled && (
          <Alert tone="danger" title={t('sales.cancelledAlertTitle')}>
            {t('sales.cancelledAlertBody')}
          </Alert>
        )}

        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.total')}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
              {discount > 0 && <p className="mt-0.5 text-xs text-muted">{t('sales.afterDiscount', { amount: formatCurrency(discount) })}</p>}
            </div>
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('common.paid')}</p>
              <p className={cn('mt-1 text-xl font-bold', paid > 0 ? 'text-success' : 'text-gray-900')}>{formatCurrency(paid)}</p>
              <p className="mt-0.5 text-xs text-muted">{payMethodLabel(sale.paymentMethod)}</p>
            </div>
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.due')}</p>
              <p className={cn('mt-1 text-xl font-bold', remaining > 0 ? 'text-warning' : 'text-gray-900')}>{formatCurrency(remaining)}</p>
              <p className="mt-0.5 text-xs text-muted">{remaining > 0 ? t('sales.outstandingCredit') : t('sales.nothingDue')}</p>
            </div>
            {canViewProfit && (
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.statRealizedProfit')}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
              <p className="mt-0.5 text-xs text-muted">{t('sales.afterDiscounts')}</p>
            </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 sm:p-10 print:border-none print:p-0 print:shadow-none">
        <div className="space-y-8">
          <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{sale.business.name}</h2>
                {isCancelled && (
                  <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">
                    {t('sales.cancelledStamp')}
                  </span>
                )}
              </div>
              {sale.business.address && (
                <p className="mt-1 text-xs text-muted">
                  {sale.business.address}, {sale.business.city}
                </p>
              )}
              {sale.business.phone && <p className="text-xs text-muted">{t('sales.phoneValue', { phone: sale.business.phone })}</p>}
            </div>

            <div className="space-y-1 sm:text-end">
              <p className="font-mono text-xl font-bold text-gray-900">{sale.invoiceNumber}</p>
              <p className="text-xs text-muted">{t('sales.dateValue', { date: saleDateLabel })}</p>
              <p className="text-xs font-medium text-gray-600">
                {t('sales.paymentValue', { method: payMethodLabel(sale.paymentMethod) })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 rounded-card border border-border bg-page p-4 text-sm sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">{t('sales.billedTo')}</span>
              {sale.customer ? (
                <div>
                  <p className="text-base font-bold text-gray-900">{sale.customer.name}</p>
                  {sale.customer.phone && <p className="mt-0.5 text-xs text-gray-600">{t('sales.phoneValue', { phone: sale.customer.phone })}</p>}
                  {sale.customer.address && <p className="text-xs text-muted">{sale.customer.address}</p>}
                </div>
              ) : (
                <p className="font-medium text-gray-700">{t('sales.walkInCashCustomer')}</p>
              )}
            </div>

            <div className="sm:text-end">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                {t('sales.statusAndPayment')}
              </span>
              <div className="flex gap-2 sm:justify-end">
                <Badge tone={payment.tone}>{t(payment.labelKey)}</Badge>
                <Badge tone={saleStatus.tone}>{t(saleStatus.labelKey)}</Badge>
              </div>
              {remaining > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-warning sm:justify-end">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('sales.balanceDue', { amount: formatCurrency(remaining) })}
                </p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th scope="col" className="py-3 font-medium">{t('sales.itemDescription')}</th>
                  <th scope="col" className="py-3 text-center font-medium">{t('common.qty')}</th>
                  <th scope="col" className="py-3 text-end font-medium">{t('sales.unitPrice')}</th>
                  <th scope="col" className="py-3 text-end font-medium">{t('common.discount')}</th>
                  <th scope="col" className="py-3 text-end font-medium">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items.map((item) => {
                  const itemPrice = item.sellingPrice;
                  const itemDisc = item.discount;
                  const itemTotal = item.lineTotal;

                  return (
                    <tr key={item.id}>
                      <td className="py-3.5">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        {item.sku && <p className="font-mono text-xs text-muted">{t('sales.skuValue', { sku: item.sku })}</p>}
                      </td>
                      <td className="py-3.5 text-center font-medium text-gray-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3.5 text-end text-gray-700">{formatCurrency(itemPrice)}</td>
                      <td className="py-3.5 text-end text-xs text-muted">{itemDisc > 0 ? formatCurrency(itemDisc) : '—'}</td>
                      <td className="py-3.5 text-end font-bold text-gray-900">{formatCurrency(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border text-sm">
                  <td colSpan={4} className="py-3 text-end text-gray-600">{`${t('common.subtotal')}:`}</td>
                  <td className="py-3 text-end font-semibold text-gray-900">{formatCurrency(subtotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr className="text-sm text-success">
                    <td colSpan={4} className="py-1.5 text-end">{t('sales.overallDiscountLabel')}</td>
                    <td className="py-1.5 text-end font-semibold">- {formatCurrency(discount)}</td>
                  </tr>
                )}
                <tr className="border-t border-border text-base font-bold text-gray-900">
                  <td colSpan={4} className="py-3 text-end">{`${t('common.grandTotal')}:`}</td>
                  <td className="py-3 text-end text-primary">{formatCurrency(total)}</td>
                </tr>
                <tr className="text-sm text-gray-600">
                  <td colSpan={4} className="py-1 text-end">{t('sales.paidAmountLabel')}</td>
                  <td className="py-1 text-end font-medium text-success">{formatCurrency(paid)}</td>
                </tr>
                {remaining > 0 && (
                  <tr className="border-t border-border text-sm font-bold text-warning">
                    <td colSpan={4} className="py-2 text-end">{t('sales.remainingDueLabel')}</td>
                    <td className="py-2 text-end">{formatCurrency(remaining)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          <div className="space-y-1 border-t border-border pt-6 text-center text-xs text-muted">
            <p className="font-medium text-gray-600">{t('sales.thankYou')}</p>
            <p>{t('sales.poweredBy')}</p>
          </div>
        </div>
      </Card>

      {sale.customer && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('sales.customerAndUdhaar')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href={`/dashboard/customers/${sale.customer.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {sale.customer.name}
              </Link>
              {sale.customer.phone && <p className="mt-0.5 text-xs text-muted">{t('sales.phoneValue', { phone: sale.customer.phone })}</p>}
            </div>
            {remaining > 0 ? (
              <div className="flex items-center gap-3 rounded-input border border-warning/25 bg-warning-soft px-4 py-3">
                <Clock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-bold text-warning">
                    {t('sales.addedToUdhaar', { amount: formatCurrency(remaining) })}
                  </p>
                  <p className="text-xs text-amber-800">{t('sales.collectNote')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-success">
                <Wallet className="h-4 w-4" aria-hidden="true" />
                <span className="font-semibold">{t('sales.fullySettled')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('sales.inventoryImpact')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-3 rounded-input border border-border bg-page p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                  <p className="font-mono text-xs text-muted">{t('sales.skuValue', { sku: item.sku || '—' })}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                  <div>
                    <p className="text-muted">{t('sales.deductedStock')}</p>
                    <p className={cn('text-sm font-bold', isCancelled ? 'text-muted line-through' : 'text-danger')}>
                      -{item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-muted">{t('sales.currentStock')}</p>
                    <p className="text-sm font-bold text-gray-900">
                      {item.currentStock} {item.unit}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/inventory/${item.productId}`}
                  className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {t('sales.viewStockHistory')}
                  <ChevronRight className="h-3 w-3 rtl-flip" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canViewProfit && (
      <div className="flex items-center justify-between rounded-card border border-success/25 bg-success-soft p-4 print:hidden">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
          <span>{t('sales.profitNote')}</span>
        </div>
        <span className="text-base font-bold text-emerald-900">{formatCurrency(totalProfit)}</span>
      </div>
      )}
    </div>
  );
}
