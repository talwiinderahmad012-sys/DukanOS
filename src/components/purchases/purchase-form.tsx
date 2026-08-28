'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2 } from 'lucide-react';
import { createPurchaseAction } from '@/app/actions/purchase.actions';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses, IconButton } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, inputClasses } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';

export type SupplierOption = {
  id: string;
  name: string;
  phone?: string | null;
};

export type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  purchasePrice: number;
  currentStock: number;
};

export type LineItem = {
  productId: string;
  productName: string;
  sku?: string | null;
  unit: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  lineTotal: number;
};

export function PurchaseForm({
  businessId,
  suppliers,
  initialProducts,
}: {
  businessId: string;
  suppliers: SupplierOption[];
  initialProducts: ProductOption[];
}) {
  const router = useRouter();
  const { t, tm, formatCurrency, formatNumber } = useTranslation();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  const [items, setItems] = useState<LineItem[]>([]);

  const [productSearch, setProductSearch] = useState<string>('');
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = initialProducts.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  const handleAddProduct = (product: ProductOption) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].lineTotal = Math.max(
        0,
        updated[existingIndex].quantity * updated[existingIndex].purchasePrice -
          updated[existingIndex].discount
      );
      setItems(updated);
    } else {
      const price = Number(product.purchasePrice) || 0;
      setItems([
        ...items,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: 1,
          purchasePrice: price,
          discount: 0,
          lineTotal: price,
        },
      ]);
    }
    setProductSearch('');
    setIsSearchingProduct(false);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof LineItem,
    value: number
  ) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = field === 'quantity' ? value : item.quantity;
    const price = field === 'purchasePrice' ? value : item.purchasePrice;
    const disc = field === 'discount' ? value : item.discount;

    item.lineTotal = Math.max(0, qty * price - disc);
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const grandTotal = Math.max(0, subtotal - Number(globalDiscount || 0));
  const remaining = Math.max(0, grandTotal - Number(paidAmount || 0));

  const paymentState =
    paidAmount >= grandTotal && grandTotal > 0
      ? 'PAID'
      : paidAmount > 0 && paidAmount < grandTotal
      ? 'PARTIAL'
      : 'UNPAID';

  const paymentBadge: { labelKey: string; tone: BadgeTone } =
    paymentState === 'PAID'
      ? { labelKey: 'purchases.fullyPaid', tone: 'success' }
      : paymentState === 'PARTIAL'
      ? { labelKey: 'purchases.partialCredit', tone: 'warning' }
      : { labelKey: 'purchases.fullCredit', tone: 'danger' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError(t('purchases.minOneItem'));
      return;
    }

    setLoading(true);

    try {
      const payload = {
        supplierId: supplierId || null,
        invoiceNumber: invoiceNumber.trim() || null,
        purchaseDate,
        notes: notes.trim() || null,
        discount: Number(globalDiscount) || 0,
        paidAmount: Number(paidAmount) || 0,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          purchasePrice: Number(i.purchasePrice),
          discount: Number(i.discount) || 0,
        })),
      };

      const result = await createPurchaseAction(businessId, payload);

      if (!result.success) {
        setError(tm(result.message) || t('purchases.createFailedFallback'));
        setLoading(false);
        return;
      }

      const purchase = result.data as { id: string };
      router.push(`/dashboard/purchases/${purchase.id}`);
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(tm(e.message) || t('purchases.unexpectedError'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label={t('purchases.formAria')}>
      {error && (
        <Alert tone="danger" title={t('purchases.unableToProcessTitle')}>
          {error}
        </Alert>
      )}

      <Card padded>
        <div className="mb-5 border-b border-border pb-3">
          <h2 className="text-base font-bold text-gray-900">{t('purchases.supplierInfoTitle')}</h2>
          <p className="text-xs text-muted">{t('purchases.supplierInfoSub')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor={fieldId('supplierId')} className="block text-sm font-medium text-gray-700">
              {t('purchases.supplierVendor')}
            </label>
            <Select
              id={fieldId('supplierId')}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">{t('purchases.directCashVendorOption')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted">{t('purchases.supplierHint')}</p>
          </div>

          <Field
            label={t('purchases.invoiceBillNumber')}
            htmlFor={fieldId('invoiceNumber')}
            hint={t('purchases.invoiceHint')}
          >
            <Input
              id={fieldId('invoiceNumber')}
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder={t('purchases.invoicePlaceholder')}
            />
          </Field>

          <Field label={t('purchases.purchaseDate')} htmlFor={fieldId('purchaseDate')}>
            <Input
              id={fieldId('purchaseDate')}
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label={t('purchases.notesLabel')} htmlFor={fieldId('notes')}>
            <Input
              id={fieldId('notes')}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('purchases.notesPlaceholder')}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>{t('purchases.purchasedProducts')}</CardTitle>
            <CardDescription>{t('purchases.productsCardDescription')}</CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
            {items.length === 1
              ? t('purchases.lineItemsOne', { count: formatNumber(items.length) })
              : t('purchases.lineItemsMany', { count: formatNumber(items.length) })}
          </span>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={productSearch}
              onFocus={() => setIsSearchingProduct(true)}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setIsSearchingProduct(true);
              }}
              placeholder={t('purchases.productSearchPlaceholder')}
              aria-label={t('purchases.productSearchAria')}
              className={inputClasses(false, 'ps-10')}
            />

            {isSearchingProduct && (
              <div className="absolute start-0 end-0 top-full z-20 mt-1 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-card border border-border bg-white shadow-elevated">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">{t('purchases.noMatchingProducts')}</div>
                ) : (
                  filteredProducts.slice(0, 10).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      aria-label={t('purchases.addProductAria', { name: prod.name })}
                      className="flex w-full items-center justify-between gap-3 p-3 text-start transition-colors hover:bg-primary-soft"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{prod.name}</p>
                        <p className="truncate font-mono text-xs text-muted">
                          {t('purchases.productMeta', {
                            sku: prod.sku || '-',
                            stock: formatNumber(prod.currentStock),
                            unit: prod.unit,
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="text-sm font-bold text-primary">{formatCurrency(Number(prod.purchasePrice))}</p>
                        <span className="text-xs font-medium text-success">{t('purchases.addItem')}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-card border-2 border-dashed border-border p-8 text-center">
              <p className="mb-2 text-sm text-gray-500">{t('purchases.noItemsYet')}</p>
              <p className="text-xs text-muted">{t('purchases.noItemsYetHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full border-collapse text-start text-sm">
                <thead>
                  <tr className="border-y border-border bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 font-medium text-start">{t('common.product')}</th>
                    <th className="w-32 px-4 py-3 font-medium text-start">{t('common.quantity')}</th>
                    <th className="w-36 px-4 py-3 font-medium text-start">{t('purchases.unitCostPkr')}</th>
                    <th className="w-28 px-4 py-3 font-medium text-start">{t('common.discount')}</th>
                    <th className="w-36 px-4 py-3 font-medium text-end">{t('purchases.lineTotal')}</th>
                    <th className="w-14 px-4 py-3">
                      <span className="sr-only">{t('purchases.removeColumnLabel')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.productId}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                        {item.sku && (
                          <p className="font-mono text-xs text-muted">
                            {t('purchases.skuLabel')}: {item.sku}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            aria-label={t('purchases.quantityForAria', { name: item.productName })}
                            className={inputClasses(false, 'w-20 font-medium')}
                          />
                          <span className="text-xs text-gray-500">{item.unit}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.purchasePrice}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              'purchasePrice',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          aria-label={t('purchases.unitCostForAria', { name: item.productName })}
                          className={inputClasses(false, 'w-28 font-medium')}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              'discount',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          aria-label={t('purchases.lineDiscountForAria', { name: item.productName })}
                          className={inputClasses(false, 'w-20')}
                        />
                      </td>

                      <td className="px-4 py-3 text-end text-sm font-bold text-gray-900">
                        {formatCurrency(item.lineTotal)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <IconButton
                          aria-label={t('purchases.removeFromPurchaseAria', { name: item.productName })}
                          title={t('purchases.removeProductTitle')}
                          onClick={() => handleRemoveItem(index)}
                          className="h-9 w-9 text-gray-500 hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card padded>
          <div className="mb-4 border-b border-border pb-3">
            <h3 className="text-base font-bold text-gray-900">{t('purchases.paymentTermsTitle')}</h3>
            <p className="text-xs text-muted">{t('purchases.paymentTermsSub')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={fieldId('paidAmount')} className="block text-sm font-medium text-gray-700">
                {t('purchases.amountPaidLabel')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {t('common.currencyUnit')}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  aria-label={t('purchases.amountPaidAria')}
                  className={inputClasses(false, 'ps-9 font-semibold')}
                />
              </div>
              <p className="text-xs text-muted">{t('purchases.amountPaidHint')}</p>
            </div>

            <div className="space-y-1">
              <label htmlFor={fieldId('globalDiscount')} className="block text-sm font-medium text-gray-700">
                {t('purchases.overallDiscountLabel')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {t('common.currencyUnit')}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  aria-label={t('purchases.overallDiscountAria')}
                  className={inputClasses(false, 'ps-9')}
                />
              </div>
              <p className="text-xs text-muted">{t('purchases.discountHint')}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-input border border-border bg-gray-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              {t('purchases.computedPaymentStatus')}
            </span>
            <Badge tone={paymentBadge.tone}>{t(paymentBadge.labelKey)}</Badge>
          </div>
        </Card>

        <Card padded>
          <div className="mb-4 border-b border-border pb-3">
            <h3 className="text-base font-bold text-gray-900">{t('purchases.invoiceSummary')}</h3>
            <p className="text-xs text-muted">{t('purchases.invoiceSummarySub')}</p>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <dt>
                {items.length === 1
                  ? t('purchases.subtotalItemsOne', { count: formatNumber(items.length) })
                  : t('purchases.subtotalItemsMany', { count: formatNumber(items.length) })}
              </dt>
              <dd className="font-semibold text-gray-900">{formatCurrency(subtotal)}</dd>
            </div>

            {globalDiscount > 0 && (
              <div className="flex items-center justify-between text-success">
                <dt>{t('common.discount')}</dt>
                <dd className="font-semibold">- {formatCurrency(globalDiscount)}</dd>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-bold text-gray-900">
              <dt>{t('common.grandTotal')}</dt>
              <dd className="text-primary">{formatCurrency(grandTotal)}</dd>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <dt>{t('purchases.paidNow')}</dt>
              <dd className="font-medium text-success">{formatCurrency(paidAmount)}</dd>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
              <dt>{t('purchases.remainingBalanceDue')}</dt>
              <dd className={cn(remaining > 0 ? 'text-warning' : 'text-gray-900')}>{formatCurrency(remaining)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <Link href="/dashboard/purchases" className={buttonClasses('outline', 'md')}>
              {t('common.cancel')}
            </Link>
            <Button type="submit" size="md" loading={loading} disabled={loading || items.length === 0}>
              {loading ? t('purchases.recordingSubmit') : t('purchases.recordSubmit')}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
