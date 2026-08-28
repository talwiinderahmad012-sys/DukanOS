'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction } from '@/app/actions/product.actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';
import { AutoTranslationHint } from '@/components/translation/auto-translation-hint';
import { getLocalizedValue } from '@/lib/translation/localized';

export function ProductForm({
  businessId,
  categories,
}: {
  businessId: string;
  categories: { id: string; name: string; nameEn?: string | null; nameUr?: string | null }[];
}) {
  const router = useRouter();
  const { language, t, tm, formatCurrency } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameValue, setNameValue] = useState('');

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
        setError(tm(res.message) || tm(fieldError) || t('products.createFailed'));
        setLoading(false);
        return;
      }

      router.push('/dashboard/products');
      router.refresh();
    } catch {
      setError(t('products.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {error && (
            <div className="p-5 pb-0">
              <Alert tone="danger" title={t('products.couldNotSaveProduct')}>
                {error}
              </Alert>
            </div>
          )}

          <section className="space-y-4 p-5" aria-labelledby="product-section-basic">
            <div>
              <h2 id="product-section-basic" className="text-sm font-bold text-gray-900">
                {t('products.basicInformation')}
              </h2>
              <p className="text-xs text-muted">{t('products.basicInformationDescription')}</p>
            </div>

            <Field
              label={t('products.productName')}
              htmlFor="product-name"
              required
              hint={<AutoTranslationHint value={nameValue} />}
            >
              <Input
                id="product-name"
                name="name"
                required
                maxLength={100}
                placeholder={t('products.namePlaceholder')}
                onChange={(e) => setNameValue(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('products.sku')} htmlFor="product-sku">
                <Input
                  id="product-sku"
                  name="sku"
                  maxLength={50}
                  placeholder={t('products.skuPlaceholder')}
                  className="font-mono"
                />
              </Field>
              <Field label={t('products.barcode')} htmlFor="product-barcode">
                <Input
                  id="product-barcode"
                  name="barcode"
                  maxLength={50}
                  placeholder={t('products.barcodePlaceholder')}
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('common.category')} htmlFor="product-category">
                <Select id="product-category" name="categoryId" defaultValue="">
                  <option value="">{t('products.noCategory')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {getLocalizedValue(category, 'name', language) ?? category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('inventory.unit')} htmlFor="product-unit" required hint={t('products.unitHint')}>
                <Input id="product-unit" name="unit" required defaultValue="pcs" maxLength={20} />
              </Field>
            </div>

            <Field label={t('common.description')} htmlFor="product-description">
              <Textarea
                id="product-description"
                name="description"
                maxLength={500}
                rows={2}
                placeholder={t('products.descriptionPlaceholder')}
              />
            </Field>
          </section>

          <section className="space-y-4 p-5" aria-labelledby="product-section-pricing">
            <div>
              <h2 id="product-section-pricing" className="text-sm font-bold text-gray-900">
                {t('products.pricing')}
              </h2>
              <p className="text-xs text-muted">{t('products.pricingDescription')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('products.purchasePrice')} htmlFor="product-purchase-price" required>
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    {t('common.pkr')}
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
                    className="ps-11"
                  />
                </div>
              </Field>
              <Field label={t('products.sellingPrice')} htmlFor="product-selling-price" required>
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    {t('common.pkr')}
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
                <p className={cn('text-lg font-bold', profit >= 0 ? 'text-success' : 'text-danger')}>
                  {margin}%
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 p-5" aria-labelledby="product-section-inventory">
            <div>
              <h2 id="product-section-inventory" className="text-sm font-bold text-gray-900">
                {t('products.inventorySection')}
              </h2>
              <p className="text-xs text-muted">
                {t('products.inventorySectionDescription')}
              </p>
            </div>

            <Field
              label={t('products.minStockThreshold')}
              htmlFor="product-min-stock"
              hint={t('products.minStockHint')}
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? t('common.saving') : t('products.saveProduct')}
          </Button>
        </div>
      </Card>
    </form>
  );
}
