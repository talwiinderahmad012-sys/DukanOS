'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProductAction } from '@/app/actions/product.actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';
import { AutoTranslationHint } from '@/components/translation/auto-translation-hint';
import { getLocalizedValue } from '@/lib/translation/localized';

export type ProductEditData = {
  id: string;
  name: string;
  nameEn?: string | null;
  nameUr?: string | null;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  descriptionEn?: string | null;
  descriptionUr?: string | null;
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
  categories: { id: string; name: string; nameEn?: string | null; nameUr?: string | null }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { language, t, tm, formatCurrency } = useTranslation();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const localizedName = getLocalizedValue(product, 'name', language) ?? product.name;
  const localizedDescription = getLocalizedValue(product, 'description', language) ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameValue, setNameValue] = useState(localizedName);
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
        setError(tm(res.message) || tm(fieldError) || t('products.updateFailed'));
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError(t('products.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!loading) onClose();
      }}
      title={t('products.editProduct')}
      description={t('products.editDescription', { name: localizedName })}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="product-edit-form" loading={loading}>
            {t('products.saveChanges')}
          </Button>
        </>
      }
    >
      <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert tone="danger" title={t('products.couldNotSaveProduct')}>
            {error}
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby={`${idPrefix}-basic`}>
          <div>
            <h3 id={`${idPrefix}-basic`} className="text-sm font-bold text-gray-900">
              {t('products.basicInformation')}
            </h3>
            <p className="text-xs text-muted">{t('products.basicInformationDescription')}</p>
          </div>

          <Field
            label={t('products.productName')}
            htmlFor={fieldId('name')}
            required
            hint={<AutoTranslationHint value={nameValue} />}
          >
            <Input
              id={fieldId('name')}
              name="name"
              required
              defaultValue={localizedName}
              maxLength={100}
              onChange={(e) => setNameValue(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('products.sku')} htmlFor={fieldId('sku')}>
              <Input
                id={fieldId('sku')}
                name="sku"
                defaultValue={product.sku ?? ''}
                maxLength={50}
                placeholder={t('products.skuPlaceholder')}
                className="font-mono"
              />
            </Field>
            <Field label={t('products.barcode')} htmlFor={fieldId('barcode')}>
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
            <Field label={t('common.category')} htmlFor={fieldId('categoryId')}>
              <Select id={fieldId('categoryId')} name="categoryId" defaultValue={product.categoryId ?? ''}>
                <option value="">{t('products.noCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {getLocalizedValue(category, 'name', language) ?? category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('inventory.unit')} htmlFor={fieldId('unit')} required hint={t('products.unitHint')}>
              <Input id={fieldId('unit')} name="unit" required defaultValue={product.unit} maxLength={20} />
            </Field>
          </div>

          <Field label={t('common.description')} htmlFor={fieldId('description')}>
            <Textarea
              id={fieldId('description')}
              name="description"
              defaultValue={localizedDescription}
              maxLength={500}
              rows={2}
              placeholder={t('products.descriptionPlaceholder')}
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-pricing`}>
          <div>
            <h3 id={`${idPrefix}-pricing`} className="text-sm font-bold text-gray-900">
              {t('products.pricing')}
            </h3>
            <p className="text-xs text-muted">{t('products.pricingDescription')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('products.purchasePrice')} htmlFor={fieldId('purchasePrice')} required>
              <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {t('common.pkr')}
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
                  className="ps-11"
                />
              </div>
            </Field>
            <Field label={t('products.sellingPrice')} htmlFor={fieldId('sellingPrice')} required>
              <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {t('common.pkr')}
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
                  className="ps-11"
                />
              </div>
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-card border border-border bg-gray-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('products.expectedProfit')}</p>
              <p className={cn('text-lg font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('products.margin')}</p>
              <p className={cn('text-lg font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>{margin}%</p>
            </div>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-inventory`}>
          <div>
            <h3 id={`${idPrefix}-inventory`} className="text-sm font-bold text-gray-900">
              {t('products.inventorySection')}
            </h3>
            <p className="text-xs text-muted">
              {t('products.editInventoryDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('inventory.currentStock')} htmlFor={fieldId('currentStock')} hint={t('products.adjustedViaMovements')}>
              <Input
                id={fieldId('currentStock')}
                value={`${product.currentStock} ${product.unit}`}
                disabled
                readOnly
              />
            </Field>
            <Field
              label={t('products.minStockThreshold')}
              htmlFor={fieldId('minStockThreshold')}
              hint={t('products.minStockHint')}
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
