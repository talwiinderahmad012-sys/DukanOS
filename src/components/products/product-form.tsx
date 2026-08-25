'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction } from '@/app/actions/product.actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';

export function ProductForm({
  businessId,
  categories,
}: {
  businessId: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  const profit = sellingPrice - purchasePrice;
  const margin =
    purchasePrice > 0
      ? ((profit / purchasePrice) * 100).toFixed(1)
      : sellingPrice > 0
        ? '100.0'
        : '0.0';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const payload = {
      name: formData.get('name') as string,
      sku: (formData.get('sku') as string) || null,
      barcode: (formData.get('barcode') as string) || null,
      description: (formData.get('description') as string) || null,
      categoryId: (formData.get('categoryId') as string) || null,
      unit: formData.get('unit') as string,
      purchasePrice: Number(formData.get('purchasePrice')),
      sellingPrice: Number(formData.get('sellingPrice')),
      minStockThreshold: Number(formData.get('minStockThreshold')),
    };

    try {
      const res = await createProductAction(businessId, payload);

      if (!res.success) {
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(res.message || fieldError || 'Failed to create product');
        setLoading(false);
        return;
      }

      router.push('/dashboard/products');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {error && (
            <div className="p-5 pb-0">
              <Alert tone="danger" title="Could not save product">
                {error}
              </Alert>
            </div>
          )}

          <section className="space-y-4 p-5" aria-labelledby="product-section-basic">
            <div>
              <h2 id="product-section-basic" className="text-sm font-bold text-gray-900">
                Basic Information
              </h2>
              <p className="text-xs text-muted">Name and identifiers used on invoices and barcode scans.</p>
            </div>

            <Field label="Product Name" htmlFor="product-name" required>
              <Input id="product-name" name="name" required maxLength={100} placeholder="e.g. Nestle Pure Life 1.5L" />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="SKU" htmlFor="product-sku">
                <Input
                  id="product-sku"
                  name="sku"
                  maxLength={50}
                  placeholder="e.g. ITEM-001"
                  className="font-mono"
                />
              </Field>
              <Field label="Barcode" htmlFor="product-barcode">
                <Input
                  id="product-barcode"
                  name="barcode"
                  maxLength={50}
                  placeholder="e.g. 8901234567890"
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="product-category">
                <Select id="product-category" name="categoryId" defaultValue="">
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Unit" htmlFor="product-unit" required hint="e.g. pcs, kg, box">
                <Input id="product-unit" name="unit" required defaultValue="pcs" maxLength={20} />
              </Field>
            </div>

            <Field label="Description" htmlFor="product-description">
              <Textarea
                id="product-description"
                name="description"
                maxLength={500}
                rows={2}
                placeholder="Optional notes about this product"
              />
            </Field>
          </section>

          <section className="space-y-4 p-5" aria-labelledby="product-section-pricing">
            <div>
              <h2 id="product-section-pricing" className="text-sm font-bold text-gray-900">
                Pricing
              </h2>
              <p className="text-xs text-muted">Cost price you pay suppliers and the price customers pay.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Purchase Price" htmlFor="product-purchase-price" required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rs.
                  </span>
                  <Input
                    id="product-purchase-price"
                    name="purchasePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="pl-11"
                  />
                </div>
              </Field>
              <Field label="Selling Price" htmlFor="product-selling-price" required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rs.
                  </span>
                  <Input
                    id="product-selling-price"
                    name="sellingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="pl-11"
                  />
                </div>
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-card border border-border bg-gray-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Expected Profit</p>
                <p className={cn('text-lg font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>
                  Rs. {profit.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Margin</p>
                <p className={cn('text-lg font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>
                  {margin}%
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 p-5" aria-labelledby="product-section-inventory">
            <div>
              <h2 id="product-section-inventory" className="text-sm font-bold text-gray-900">
                Inventory
              </h2>
              <p className="text-xs text-muted">
                New products start at 0 stock. Record opening stock from the Inventory page after saving.
              </p>
            </div>

            <Field
              label="Minimum Stock Threshold"
              htmlFor="product-min-stock"
              hint="You will be alerted when stock falls below this level."
            >
              <Input
                id="product-min-stock"
                name="minStockThreshold"
                type="number"
                min="0"
                step="1"
                required
                defaultValue="5"
              />
            </Field>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-gray-50/50 px-5 py-4">
          <Button variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? 'Saving…' : 'Save Product'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
