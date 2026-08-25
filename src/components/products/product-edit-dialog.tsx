'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProductAction } from '@/app/actions/product.actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';

export type ProductEditData = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  currentStock: number;
};

export function ProductEditDialog({
  businessId,
  product,
  categories,
  onClose,
}: {
  businessId: string;
  product: ProductEditData;
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice);
  const [sellingPrice, setSellingPrice] = useState(product.sellingPrice);

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
      const res = await updateProductAction(businessId, product.id, payload);

      if (!res.success) {
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(res.message || fieldError || 'Failed to update product');
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!loading) onClose();
      }}
      title="Edit Product"
      description={`Update details, pricing and reorder level for ${product.name}.`}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="product-edit-form" loading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert tone="danger" title="Could not save product">
            {error}
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby={`${idPrefix}-basic`}>
          <div>
            <h3 id={`${idPrefix}-basic`} className="text-sm font-bold text-gray-900">
              Basic Information
            </h3>
            <p className="text-xs text-muted">Name and identifiers used on invoices and barcode scans.</p>
          </div>

          <Field label="Product Name" htmlFor={fieldId('name')} required>
            <Input id={fieldId('name')} name="name" required defaultValue={product.name} maxLength={100} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor={fieldId('sku')}>
              <Input
                id={fieldId('sku')}
                name="sku"
                defaultValue={product.sku ?? ''}
                maxLength={50}
                placeholder="e.g. ITEM-001"
                className="font-mono"
              />
            </Field>
            <Field label="Barcode" htmlFor={fieldId('barcode')}>
              <Input
                id={fieldId('barcode')}
                name="barcode"
                defaultValue={product.barcode ?? ''}
                maxLength={50}
                className="font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor={fieldId('categoryId')}>
              <Select id={fieldId('categoryId')} name="categoryId" defaultValue={product.categoryId ?? ''}>
                <option value="">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit" htmlFor={fieldId('unit')} required hint="e.g. pcs, kg, box">
              <Input id={fieldId('unit')} name="unit" required defaultValue={product.unit} maxLength={20} />
            </Field>
          </div>

          <Field label="Description" htmlFor={fieldId('description')}>
            <Textarea
              id={fieldId('description')}
              name="description"
              defaultValue={product.description ?? ''}
              maxLength={500}
              rows={2}
              placeholder="Optional notes about this product"
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-pricing`}>
          <div>
            <h3 id={`${idPrefix}-pricing`} className="text-sm font-bold text-gray-900">
              Pricing
            </h3>
            <p className="text-xs text-muted">Cost price you pay suppliers and the price customers pay.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Purchase Price" htmlFor={fieldId('purchasePrice')} required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  Rs.
                </span>
                <Input
                  id={fieldId('purchasePrice')}
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
            <Field label="Selling Price" htmlFor={fieldId('sellingPrice')} required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  Rs.
                </span>
                <Input
                  id={fieldId('sellingPrice')}
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
              <p className={cn('text-lg font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>{margin}%</p>
            </div>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-inventory`}>
          <div>
            <h3 id={`${idPrefix}-inventory`} className="text-sm font-bold text-gray-900">
              Inventory
            </h3>
            <p className="text-xs text-muted">
              Current stock is managed from the Inventory page. The reorder level controls low-stock alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Current Stock" htmlFor={fieldId('currentStock')} hint="Adjusted via stock movements">
              <Input
                id={fieldId('currentStock')}
                value={`${product.currentStock} ${product.unit}`}
                disabled
                readOnly
              />
            </Field>
            <Field
              label="Minimum Stock Threshold"
              htmlFor={fieldId('minStockThreshold')}
              hint="You will be alerted when stock falls below this level."
            >
              <Input
                id={fieldId('minStockThreshold')}
                name="minStockThreshold"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={product.minStockThreshold}
              />
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  );
}
