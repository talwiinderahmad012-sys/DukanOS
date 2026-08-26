import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { getPurchaseById } from '@/services/purchases';
import { CancelPurchaseButton } from '@/components/purchases/cancel-purchase-button';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ChevronRight,
  Receipt,
  Truck,
  Calendar,
  Package,
  ArrowUpRight,
  Ban,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Table, TableWrap, TableHead, Th, Tr, Td } from '@/components/ui/table';
import { cn } from '@/components/ui/cn';

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

function paymentStatusOf(total: number, paid: number): { label: string; tone: BadgeTone } {
  if (paid >= total && total > 0) return { label: 'Fully Paid', tone: 'success' };
  if (paid > 0 && paid < total) return { label: 'Partially Paid', tone: 'warning' };
  return { label: 'Unpaid (Full Due)', tone: 'danger' };
}

function purchaseStatusOf(status: string): { label: string; tone: BadgeTone } {
  if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'neutral' };
  return { label: 'Received', tone: 'info' };
}

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));
  const { id } = await params;

  const purchase = await getPurchaseById(business.id, id);
  if (!purchase) {
    notFound();
  }

  const total = Number(purchase.total);
  const paid = Number(purchase.paidAmount);
  const discount = Number(purchase.discount);
  const subtotal = Number(purchase.subtotal);
  const remaining = Math.max(0, total - paid);

  const payment = paymentStatusOf(total, paid);
  const purchaseStatus = purchaseStatusOf(purchase.status);
  const isCancelled = purchase.status === 'CANCELLED';
  const canManage = membership.role === 'OWNER' || membership.role === 'MANAGER';

  const invoiceLabel = purchase.invoiceNumber || `#${purchase.id.slice(0, 8)}`;

  const purchaseDateLabel = new Date(purchase.purchaseDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-muted">
            <li>
              <Link href="/dashboard/purchases" className="transition-colors hover:text-primary">
                Purchases
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-gray-400" />
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
              <Badge tone={purchaseStatus.tone}>{purchaseStatus.label}</Badge>
              <Badge tone={payment.tone}>{payment.label}</Badge>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
              Purchase date: {purchaseDateLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <CancelPurchaseButton
                businessId={business.id}
                purchaseId={purchase.id}
                invoiceNumber={purchase.invoiceNumber}
                isCancelled={isCancelled}
              />
            ) : (
              isCancelled && (
                <Badge tone="neutral">
                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                  Cancelled Purchase
                </Badge>
              )
            )}
          </div>
        </div>

        {isCancelled && (
          <Alert tone="danger" title="This purchase has been cancelled">
            Purchased stock was reversed from inventory and the product unit cost was restored to the latest
            valid purchase. The cancellation reason is appended to the invoice notes below.
          </Alert>
        )}
      </div>

      {/* Financial summary (backend values only) */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Grand Total</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(total)}</p>
            {discount > 0 && <p className="mt-0.5 text-xs text-muted">after {fmt(discount)} discount</p>}
          </div>
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Paid</p>
            <p className={cn('mt-1 text-xl font-bold', paid > 0 ? 'text-success' : 'text-gray-900')}>{fmt(paid)}</p>
            <p className="mt-0.5 text-xs text-muted">paid to supplier</p>
          </div>
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Remaining Balance</p>
            <p className={cn('mt-1 text-xl font-bold', remaining > 0 ? 'text-warning' : 'text-gray-900')}>{fmt(remaining)}</p>
            <p className="mt-0.5 text-xs text-muted">{remaining > 0 ? 'due to supplier' : 'nothing due'}</p>
          </div>
          <div className="bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Payment Status</p>
            <div className="mt-1.5">
              <Badge tone={payment.tone}>{payment.label}</Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted">{purchaseStatus.label}</p>
          </div>
        </div>
      </Card>

      {/* Supplier & invoice info */}
      <Card padded>
        <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Supplier / Vendor</p>
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
              <p className="font-medium text-gray-700 italic">Direct / Cash Vendor</p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Invoice Details</p>
            <p className="font-mono text-sm font-medium text-gray-900">
              {purchase.invoiceNumber || `System ref #${purchase.id.slice(0, 8)}`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {purchase.items.length} {purchase.items.length === 1 ? 'product' : 'products'} purchased
            </p>
          </div>
        </div>

        {purchase.notes && (
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Notes / Remarks: </span>
            <span className="whitespace-pre-wrap">{purchase.notes}</span>
          </div>
        )}
      </Card>

      {/* Purchased line items */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            Purchased Products
          </h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {purchase.items.length} {purchase.items.length === 1 ? 'Product' : 'Products'}
          </span>
        </div>

        <TableWrap>
          <Table className="min-w-[640px] whitespace-nowrap">
            <TableHead>
              <tr>
                <Th>Product</Th>
                <Th className="text-center">Quantity</Th>
                <Th className="text-right">Unit Cost</Th>
                <Th className="text-right">Discount</Th>
                <Th className="text-right">Line Total</Th>
              </tr>
            </TableHead>
            <tbody>
              {purchase.items.map((item) => {
                const itemPrice = Number(item.purchasePrice);
                const itemDiscount = Number(item.discount);
                const itemLineTotal = Number(item.lineTotal);

                return (
                  <Tr key={item.id}>
                    <Td>
                      <Link
                        href={`/dashboard/inventory/${item.productId}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-gray-900 transition-colors hover:text-primary hover:underline"
                      >
                        {item.product.name}
                        <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-muted">SKU: {item.product.sku || 'N/A'}</p>
                    </Td>
                    <Td className="text-center font-bold text-gray-900">
                      {item.quantity} <span className="text-xs font-normal text-gray-500">{item.product.unit}</span>
                    </Td>
                    <Td className="text-right font-medium text-gray-900">{fmt(itemPrice)}</Td>
                    <Td className="text-right text-sm text-gray-500">
                      {itemDiscount > 0 ? fmt(itemDiscount) : '–'}
                    </Td>
                    <Td className="text-right font-bold text-gray-900">{fmt(itemLineTotal)}</Td>
                  </Tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/70 text-sm text-gray-700">
                <td colSpan={4} className="px-4 py-3 text-right font-medium">
                  Subtotal:
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr className="bg-gray-50/70 text-sm text-success">
                  <td colSpan={4} className="px-4 py-2 text-right font-medium">
                    Invoice Discount:
                  </td>
                  <td className="px-4 py-2 text-right font-bold">- {fmt(discount)}</td>
                </tr>
              )}
              <tr className="bg-gray-100 text-base text-gray-900">
                <td colSpan={4} className="px-4 py-3.5 text-right font-bold">
                  Grand Total:
                </td>
                <td className="px-4 py-3.5 text-right font-bold text-primary">{fmt(total)}</td>
              </tr>
            </tfoot>
          </Table>
        </TableWrap>
      </Card>

      {/* Inventory impact */}
      <Card padded>
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Package className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-gray-900">Inventory Stock Impact</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchase.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-gray-50/50 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.product.name}</p>
                <p className="font-mono text-xs text-muted">SKU: {item.product.sku || '-'}</p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                <div>
                  <p className="text-gray-500">{isCancelled ? 'Reversed Stock' : 'Procured Stock'}</p>
                  <p
                    className={cn(
                      'text-sm font-bold',
                      isCancelled ? 'text-gray-400 line-through' : 'text-success',
                    )}
                  >
                    +{item.quantity} {item.product.unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500">Current Stock</p>
                  <p className="text-sm font-bold text-gray-900">
                    {item.product.currentStock} {item.product.unit}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/inventory/${item.productId}`}
                className="flex items-center justify-end gap-1 text-xs font-medium text-primary hover:underline"
              >
                View Stock History &rarr;
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
