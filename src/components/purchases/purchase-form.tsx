'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Search, 
  Receipt, 
  DollarSign, 
  Truck, 
  Calendar, 
  AlertCircle, 
  Check, 
  Layers
} from 'lucide-react';
import { createPurchaseAction } from '@/app/actions/purchase.actions';
import Link from 'next/link';

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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to process purchase</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 1. Header Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
          <Receipt className="w-5 h-5 text-blue-600" />
          Purchase Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-gray-400" /> Supplier / Vendor
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Direct / Cash Vendor (No Profile) --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Select an existing supplier to track payment history.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-gray-400" /> Invoice / Bill Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-9042"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Supplier bill or internal memo ID.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" /> Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Purchase Notes / Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional remarks (e.g., delivered via cargo, payment terms)"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 2. Product Line Items Builder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Purchased Products
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
            {items.length} {items.length === 1 ? 'Line Item' : 'Line Items'}
          </span>
        </div>

        {/* Product Selector / Search Bar */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={productSearch}
              onFocus={() => setIsSearchingProduct(true)}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setIsSearchingProduct(true);
              }}
              placeholder="Search product by name, SKU, or barcode to add line item..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchingProduct && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-20 divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No matching products found.
                </div>
              ) : (
                filteredProducts.slice(0, 10).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAddProduct(prod)}
                    className="w-full p-3 text-left hover:bg-blue-50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{prod.name}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        SKU: {prod.sku || '-'} | Stock: {prod.currentStock} {prod.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">
                        Rs. {Number(prod.purchasePrice).toLocaleString()}
                      </p>
                      <span className="text-xs text-green-600 font-medium">+ Add Item</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Line Items Table */}
        {items.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
            <p className="text-gray-500 text-sm mb-2">No products added to this purchase yet.</p>
            <p className="text-xs text-gray-400">
              Search above or select from your catalog to record purchased stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-y">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium w-32">Quantity</th>
                  <th className="px-4 py-3 font-medium w-36">Unit Cost (PKR)</th>
                  <th className="px-4 py-3 font-medium w-28">Discount</th>
                  <th className="px-4 py-3 font-medium text-right w-36">Line Total</th>
                  <th className="px-4 py-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.productId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{item.productName}</p>
                      {item.sku && (
                        <p className="text-xs text-gray-400 font-mono">SKU: {item.sku}</p>
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
                          className="w-20 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                        className="w-28 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">
                      Rs. {item.lineTotal.toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Financial Summary & Payment Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Payment Input Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Payment Terms & Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Paid (Cash / Transfer)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Amount paid directly upon receipt.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overall Invoice Discount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Supplier concession or promo deduction.</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Computed Payment Status
            </span>
            {paymentState === 'PAID' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                <Check className="w-3.5 h-3.5" /> Fully Paid
              </span>
            ) : paymentState === 'PARTIAL' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                Partially Paid (Credit)
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                Unpaid / Full Credit
              </span>
            )}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b pb-2">
            Invoice Summary
          </h3>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({items.length} items)</span>
              <span className="font-semibold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
            </div>

            {globalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-semibold">- Rs. {globalDiscount.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t pt-2.5 flex justify-between text-base font-bold text-gray-900">
              <span>Grand Total</span>
              <span className="text-blue-600">Rs. {grandTotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-gray-600 text-sm">
              <span>Paid Now</span>
              <span className="font-medium text-green-600">Rs. {paidAmount.toLocaleString()}</span>
            </div>

            <div className="border-t pt-2 flex justify-between text-base font-bold">
              <span>Remaining Balance (Due)</span>
              <span className={remaining > 0 ? 'text-orange-600' : 'text-gray-900'}>
                Rs. {remaining.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t flex flex-col sm:flex-row gap-3 justify-end">
            <Link
              href="/dashboard/purchases"
              className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium text-center transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Recording Purchase & Stock...</span>
              ) : (
                <span>Confirm & Record Purchase</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
