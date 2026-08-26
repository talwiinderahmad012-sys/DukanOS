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

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

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
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  // Form State
  const [supplierId, setSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Line items state
  const [items, setItems] = useState<LineItem[]>([]);

  // Product Search / Selector state
  const [productSearch, setProductSearch] = useState<string>('');
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);

  // Form Submission State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered available products for picker
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
    // Check if already in items
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex > -1) {
      // Increment quantity
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

    // Recalculate line total
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

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const grandTotal = Math.max(0, subtotal - Number(globalDiscount || 0));
  const remaining = Math.max(0, grandTotal - Number(paidAmount || 0));

  // Determine Payment State
  const paymentState =
    paidAmount >= grandTotal && grandTotal > 0
      ? 'PAID'
      : paidAmount > 0 && paidAmount < grandTotal
      ? 'PARTIAL'
      : 'UNPAID';

  const paymentBadge: { label: string; tone: BadgeTone } =
    paymentState === 'PAID'
      ? { label: 'Fully Paid', tone: 'success' }
      : paymentState === 'PARTIAL'
      ? { label: 'Partially Paid (Credit)', tone: 'warning' }
      : { label: 'Unpaid / Full Credit', tone: 'danger' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Please add at least one product line item.');
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
        setError(result.message || 'Failed to create purchase invoice');
        setLoading(false);
        return;
      }

      const purchase = result.data as { id: string };
      router.push(`/dashboard/purchases/${purchase.id}`);
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Record new purchase">
      {error && (
        <Alert tone="danger" title="Unable to process purchase">
          {error}
        </Alert>
      )}

      {/* 1. Supplier & purchase information */}
      <Card padded>
        <div className="mb-5 border-b border-border pb-3">
          <h2 className="text-base font-bold text-gray-900">Supplier & Purchase Information</h2>
          <p className="text-xs text-muted">Who supplied the stock and when it was received.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor={fieldId('supplierId')} className="block text-sm font-medium text-gray-700">
              Supplier / Vendor
            </label>
            <Select
              id={fieldId('supplierId')}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">-- Direct / Cash Vendor (No Profile) --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted">Select an existing supplier to track payment history.</p>
          </div>

          <Field
            label="Invoice / Bill Number"
            htmlFor={fieldId('invoiceNumber')}
            hint="Supplier bill or internal memo ID."
          >
            <Input
              id={fieldId('invoiceNumber')}
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-9042"
            />
          </Field>

          <Field label="Purchase Date" htmlFor={fieldId('purchaseDate')}>
            <Input
              id={fieldId('purchaseDate')}
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Purchase Notes / Remarks" htmlFor={fieldId('notes')}>
            <Input
              id={fieldId('notes')}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks (e.g., delivered via cargo, payment terms)"
            />
          </Field>
        </div>
      </Card>

      {/* 2. Product line items */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>Purchased Products</CardTitle>
            <CardDescription>Search your catalog and add products received in this purchase.</CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
            {items.length} {items.length === 1 ? 'Line Item' : 'Line Items'}
          </span>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Product selector / search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
              placeholder="Search product by name, SKU, or barcode to add line item…"
              aria-label="Search products to add to this purchase"
              className={inputClasses(false, 'pl-10')}
            />

            {/* Autocomplete dropdown */}
            {isSearchingProduct && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-card border border-border bg-white shadow-elevated">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No matching products found.</div>
                ) : (
                  filteredProducts.slice(0, 10).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      aria-label={`Add ${prod.name} to purchase`}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-primary-soft"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{prod.name}</p>
                        <p className="truncate font-mono text-xs text-muted">
                          SKU: {prod.sku || '-'} | Stock: {prod.currentStock} {prod.unit}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-primary">{fmt(Number(prod.purchasePrice))}</p>
                        <span className="text-xs font-medium text-success">+ Add Item</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Line items table */}
          {items.length === 0 ? (
            <div className="rounded-card border-2 border-dashed border-border p-8 text-center">
              <p className="mb-2 text-sm text-gray-500">No products added to this purchase yet.</p>
              <p className="text-xs text-muted">Search above or select from your catalog to record purchased stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-border bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="w-32 px-4 py-3 font-medium">Quantity</th>
                    <th className="w-36 px-4 py-3 font-medium">Unit Cost (PKR)</th>
                    <th className="w-28 px-4 py-3 font-medium">Discount</th>
                    <th className="w-36 px-4 py-3 text-right font-medium">Line Total</th>
                    <th className="w-14 px-4 py-3">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.productId}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                        {item.sku && <p className="font-mono text-xs text-muted">SKU: {item.sku}</p>}
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
                            aria-label={`Quantity for ${item.productName}`}
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
                          aria-label={`Unit cost for ${item.productName}`}
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
                          aria-label={`Line discount for ${item.productName}`}
                          className={inputClasses(false, 'w-20')}
                        />
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {fmt(item.lineTotal)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <IconButton
                          aria-label={`Remove ${item.productName} from purchase`}
                          title="Remove product"
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

      {/* 3. Payment & summary */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Payment input card */}
        <Card padded>
          <div className="mb-4 border-b border-border pb-3">
            <h3 className="text-base font-bold text-gray-900">Payment Terms & Status</h3>
            <p className="text-xs text-muted">How much was paid to the supplier on receipt.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={fieldId('paidAmount')} className="block text-sm font-medium text-gray-700">
                Amount Paid (Cash / Transfer)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  aria-label="Amount paid"
                  className={inputClasses(false, 'pl-9 font-semibold')}
                />
              </div>
              <p className="text-xs text-muted">Amount paid directly upon receipt.</p>
            </div>

            <div className="space-y-1">
              <label htmlFor={fieldId('globalDiscount')} className="block text-sm font-medium text-gray-700">
                Overall Invoice Discount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  aria-label="Overall invoice discount"
                  className={inputClasses(false, 'pl-9')}
                />
              </div>
              <p className="text-xs text-muted">Supplier concession or promo deduction.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-input border border-border bg-gray-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Computed Payment Status
            </span>
            <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
          </div>
        </Card>

        {/* Invoice summary */}
        <Card padded>
          <div className="mb-4 border-b border-border pb-3">
            <h3 className="text-base font-bold text-gray-900">Invoice Summary</h3>
            <p className="text-xs text-muted">Totals update live as you edit line items.</p>
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <dt>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</dt>
              <dd className="font-semibold text-gray-900">{fmt(subtotal)}</dd>
            </div>

            {globalDiscount > 0 && (
              <div className="flex items-center justify-between text-success">
                <dt>Discount</dt>
                <dd className="font-semibold">- {fmt(globalDiscount)}</dd>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-bold text-gray-900">
              <dt>Grand Total</dt>
              <dd className="text-primary">{fmt(grandTotal)}</dd>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <dt>Paid Now</dt>
              <dd className="font-medium text-success">{fmt(paidAmount)}</dd>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Remaining Balance (Due)</dt>
              <dd className={cn(remaining > 0 ? 'text-warning' : 'text-gray-900')}>{fmt(remaining)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <Link href="/dashboard/purchases" className={buttonClasses('outline', 'md')}>
              Cancel
            </Link>
            <Button type="submit" size="md" loading={loading} disabled={loading || items.length === 0}>
              {loading ? 'Recording Purchase & Stock…' : 'Confirm & Record Purchase'}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
