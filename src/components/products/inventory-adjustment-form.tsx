'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStockAction } from '@/app/actions/inventory.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Field, Select, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';

export function InventoryAdjustmentForm({
  businessId,
  productId,
  currentStock,
  unit = 'pcs',
}: {
  businessId: string;
  productId: string;
  currentStock: number;
  unit?: string;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState(0);

  const newStock = adjustmentType === 'add' ? currentStock + quantity : currentStock - quantity;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError('');

    if (newStock < 0) {
      setError(t('inventory.stockBelowZero'));
      setLoading(false);
      return;
    }

    const formData = new FormData(form);
    const payload = {
      productId,
      newStock,
      reason: formData.get('reason') as string,
    };

    try {
      const res = await adjustStockAction(businessId, payload);
      if (!res.success) {
        setError(tm(res.message) || t('inventory.adjustFailed'));
        setLoading(false);
        return;
      }

      setQuantity(0);
      form.reset();
      router.refresh();
      setLoading(false);
    } catch {
      setError(t('inventory.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('inventory.adjustStock')}</CardTitle>
        <CardDescription>{t('inventory.adjustStockDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label={t('inventory.adjustStockAria')}>
          <Alert tone="warning" title={t('inventory.adjustWarningTitle')}>
            {t('inventory.adjustWarningBody')}
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('inventory.action')} htmlFor="adjustment-action">
              <Select
                id="adjustment-action"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="add">{t('inventory.addStockOption')}</option>
                <option value="subtract">{t('inventory.reduceStockOption')}</option>
              </Select>
            </Field>
            <Field label={t('inventory.quantityUnit', { unit })} htmlFor="adjustment-quantity">
              <Input
                id="adjustment-quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label={t('inventory.reason')} htmlFor="adjustment-reason" required>
            <Select id="adjustment-reason" name="reason" required defaultValue="Opening Stock">
              <option value="Opening Stock">{t('inventory.openingStock')}</option>
              <option value="Correction">{t('inventory.reasonCorrection')}</option>
              <option value="Damage">{t('inventory.movementDamage')}</option>
              <option value="Loss">{t('inventory.movementLoss')}</option>
              <option value="Other">{t('common.other')}</option>
            </Select>
          </Field>

          <div
            className="flex items-center justify-between rounded-input border border-border bg-gray-50 px-4 py-3"
            aria-live="polite"
          >
            <span className="text-sm font-medium text-gray-600">
              {t('inventory.resultingStock', {
                currentStock,
                sign: adjustmentType === 'add' ? '+' : '−',
                quantity,
              })}
            </span>
            <span className={cn('text-lg font-bold tabular-nums', newStock < 0 ? 'text-danger' : 'text-gray-900')}>
              {newStock} {unit}
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={quantity <= 0 || newStock < 0}
            className="w-full"
          >
            {loading ? t('inventory.adjusting') : t('inventory.confirmAdjustment')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
