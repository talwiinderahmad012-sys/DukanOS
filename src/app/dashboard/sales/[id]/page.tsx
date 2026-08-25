import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getSaleById } from '@/services/sales';
import { CancelSaleButton } from '@/components/sales/cancel-sale-button';
import { PrintButton } from '@/components/sales/print-button';
import { InvoiceFeedbackButton } from '@/components/feedback/invoice-feedback-button';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, TrendingUp, Package, User, Wallet, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

type PaymentTone = { label: string; tone: BadgeTone };

function paymentStatusOf(total: number, paid: number): PaymentTone {
  if (paid >= total && total > 0) return { label: 'Paid', tone: 'success' };
  if (paid > 0 && paid < total) return { label: 'Partial', tone: 'warning' };
  return { label: 'Udhaar', tone: 'danger' };
}

function saleStatusOf(status: string): { label: string; tone: BadgeTone } {
  if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' };
  if (status === 'REFUNDED') return { label: 'Refunded', tone: 'info' };
  return { label: 'Completed', tone: 'success' };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  MOBILE_WALLET: 'Mobile Wallet',
  CREDIT: 'Credit (Udhaar)',
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const sale = await getSaleById(business.id, id);
  if (!sale) {
    notFound();
  }

  const total = Number(sale.total);
  const paid = Number(sale.paidAmount);
  const discount = Number(sale.discount);
  const subtotal = Number(sale.subtotal);
  const remaining = Math.max(0, total - paid);

  const totalProfit = sale.items.reduce((acc, item) => acc + Number(item.lineProfit), 0);

  const payment = paymentStatusOf(total, paid);
  const saleStatus = saleStatusOf(sale.status);
  const isCancelled = sale.status === 'CANCELLED';

  const saleDateLabel = sale.saleDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Sale header (hidden when printing) */}
      <div className="space-y-4 print:hidden">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted">
          <Link href="/dashboard/sales" className="hover:text-primary hover:underline">
            Sales
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
          <span aria-current="page" className="font-mono font-medium text-gray-900">
            {sale.invoiceNumber}
          </span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{sale.invoiceNumber}</h1>
              <Badge tone={payment.tone}>{payment.label}</Badge>
              <Badge tone={saleStatus.tone}>{saleStatus.label}</Badge>
            </div>
            <p className="text-sm text-muted">
              {saleDateLabel} ·{' '}
              {sale.customer ? sale.customer.name : 'Walk-in Customer'} ·{' '}
              {PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <InvoiceFeedbackButton businessId={business.id} saleId={sale.id} customerId={sale.customerId} />
            <CancelSaleButton
              businessId={business.id}
              saleId={sale.id}
              invoiceNumber={sale.invoiceNumber}
              isCancelled={isCancelled}
            />
            <PrintButton />
          </div>
        </div>

        {isCancelled && (
          <Alert tone="danger" title="This sale has been cancelled">
            Sold items were returned to stock and any unpaid Udhaar from this invoice was reversed. Amounts
            already collected were not automatically refunded.
          </Alert>
        )}

        {/* Payment summary */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{fmt(total)}</p>
              {discount > 0 && <p className="mt-0.5 text-xs text-muted">after {fmt(discount)} discount</p>}
            </div>
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Paid</p>
              <p className={cn('mt-1 text-xl font-bold', paid > 0 ? 'text-success' : 'text-gray-900')}>{fmt(paid)}</p>
              <p className="mt-0.5 text-xs text-muted">{PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</p>
            </div>
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Due</p>
              <p className={cn('mt-1 text-xl font-bold', remaining > 0 ? 'text-warning' : 'text-gray-900')}>{fmt(remaining)}</p>
              <p className="mt-0.5 text-xs text-muted">{remaining > 0 ? 'outstanding credit' : 'nothing due'}</p>
            </div>
            <div className="bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Realized Profit</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalProfit)}</p>
              <p className="mt-0.5 text-xs text-muted">after discounts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Printable invoice */}
      <Card className="p-6 sm:p-10 print:border-none print:p-0 print:shadow-none">
        <div className="space-y-8">
          {/* Invoice header */}
          <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{sale.business.name}</h2>
                {isCancelled && (
                  <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">
                    CANCELLED
                  </span>
                )}
              </div>
              {sale.business.address && (
                <p className="mt-1 text-xs text-muted">
                  {sale.business.address}, {sale.business.city}
                </p>
              )}
              {sale.business.phone && <p className="text-xs text-muted">Phone: {sale.business.phone}</p>}
            </div>

            <div className="space-y-1 sm:text-right">
              <p className="font-mono text-xl font-bold text-gray-900">{sale.invoiceNumber}</p>
              <p className="text-xs text-muted">Date: {saleDateLabel}</p>
              <p className="text-xs font-medium text-gray-600">
                Payment: {PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
              </p>
            </div>
          </div>

          {/* Customer & status */}
          <div className="grid grid-cols-1 gap-6 rounded-card border border-border bg-page p-4 text-sm sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Billed To</span>
              {sale.customer ? (
                <div>
                  <p className="text-base font-bold text-gray-900">{sale.customer.name}</p>
                  {sale.customer.phone && <p className="mt-0.5 text-xs text-gray-600">Phone: {sale.customer.phone}</p>}
                  {sale.customer.address && <p className="text-xs text-muted">{sale.customer.address}</p>}
                </div>
              ) : (
                <p className="font-medium text-gray-700">Walk-in Cash Customer</p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                Status & Payment
              </span>
              <div className="flex gap-2 sm:justify-end">
                <Badge tone={payment.tone}>{payment.label}</Badge>
                <Badge tone={saleStatus.tone}>{saleStatus.label}</Badge>
              </div>
              {remaining > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-warning sm:justify-end">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Customer balance due: {fmt(remaining)}
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th scope="col" className="py-3 font-medium">Item Description</th>
                  <th scope="col" className="py-3 text-center font-medium">Qty</th>
                  <th scope="col" className="py-3 text-right font-medium">Unit Price</th>
                  <th scope="col" className="py-3 text-right font-medium">Discount</th>
                  <th scope="col" className="py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items.map((item) => {
                  const itemPrice = Number(item.sellingPrice);
                  const itemDisc = Number(item.discount);
                  const itemTotal = Number(item.lineTotal);

                  return (
                    <tr key={item.id}>
                      <td className="py-3.5">
                        <p className="font-semibold text-gray-900">{item.product.name}</p>
                        {item.product.sku && <p className="font-mono text-xs text-muted">SKU: {item.product.sku}</p>}
                      </td>
                      <td className="py-3.5 text-center font-medium text-gray-900">
                        {item.quantity} {item.product.unit}
                      </td>
                      <td className="py-3.5 text-right text-gray-700">{fmt(itemPrice)}</td>
                      <td className="py-3.5 text-right text-xs text-muted">{itemDisc > 0 ? fmt(itemDisc) : '—'}</td>
                      <td className="py-3.5 text-right font-bold text-gray-900">{fmt(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border text-sm">
                  <td colSpan={4} className="py-3 text-right text-gray-600">Subtotal:</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{fmt(subtotal)}</td>
                </tr>
                {discount > 0 && (
                  <tr className="text-sm text-success">
                    <td colSpan={4} className="py-1.5 text-right">Overall Discount:</td>
                    <td className="py-1.5 text-right font-semibold">- {fmt(discount)}</td>
                  </tr>
                )}
                <tr className="border-t border-border text-base font-bold text-gray-900">
                  <td colSpan={4} className="py-3 text-right">Grand Total:</td>
                  <td className="py-3 text-right text-primary">{fmt(total)}</td>
                </tr>
                <tr className="text-sm text-gray-600">
                  <td colSpan={4} className="py-1 text-right">Paid Amount:</td>
                  <td className="py-1 text-right font-medium text-success">{fmt(paid)}</td>
                </tr>
                {remaining > 0 && (
                  <tr className="border-t border-border text-sm font-bold text-warning">
                    <td colSpan={4} className="py-2 text-right">Remaining Due (Udhaar):</td>
                    <td className="py-2 text-right">{fmt(remaining)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Thank you note */}
          <div className="space-y-1 border-t border-border pt-6 text-center text-xs text-muted">
            <p className="font-medium text-gray-600">Thank you for your business!</p>
            <p>Powered by DukaanOS • Cloud Retail POS</p>
          </div>
        </div>
      </Card>

      {/* Customer / Udhaar (hidden when printing) */}
      {sale.customer && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              Customer & Udhaar
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
              {sale.customer.phone && <p className="mt-0.5 text-xs text-muted">Phone: {sale.customer.phone}</p>}
            </div>
            {remaining > 0 ? (
              <div className="flex items-center gap-3 rounded-input border border-warning/25 bg-warning-soft px-4 py-3">
                <Clock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-bold text-warning">
                    {fmt(remaining)} added to customer Udhaar from this sale
                  </p>
                  <p className="text-xs text-amber-800">Collect via the customer ledger or a future payment.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-success">
                <Wallet className="h-4 w-4" aria-hidden="true" />
                <span className="font-semibold">Fully settled — no Udhaar from this sale</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory impact (hidden when printing) */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            Inventory Stock Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-3 rounded-input border border-border bg-page p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.product.name}</p>
                  <p className="font-mono text-xs text-muted">SKU: {item.product.sku || '—'}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                  <div>
                    <p className="text-muted">Deducted Stock</p>
                    <p className={cn('text-sm font-bold', isCancelled ? 'text-muted line-through' : 'text-danger')}>
                      -{item.quantity} {item.product.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted">Current Stock</p>
                    <p className="text-sm font-bold text-gray-900">
                      {item.product.currentStock} {item.product.unit}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/inventory/${item.productId}`}
                  className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View Stock History
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Realized profit note (kept out of print output) */}
      <div className="flex items-center justify-between rounded-card border border-success/25 bg-success-soft p-4 print:hidden">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
          <span>Realized Gross Profit on this Sale</span>
        </div>
        <span className="text-base font-bold text-emerald-900">{fmt(totalProfit)}</span>
      </div>
    </div>
  );
}
