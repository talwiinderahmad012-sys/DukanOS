'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStockAction } from '@/app/actions/inventory.actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Field, Select, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

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
      setError('Stock cannot go below zero.');
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
        setError(res.message || 'Failed to adjust stock');
        setLoading(false);
        return;
      }

      setQuantity(0);
      form.reset();
      router.refresh();
      setLoading(false);
    } catch {
      setError('Unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust Stock</CardTitle>
        <CardDescription>Manually correct the stock level for this product.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Adjust stock for this product">
          <Alert tone="warning" title="This changes live inventory">
            The adjustment updates stock immediately and writes a permanent movement record. It cannot be undone.
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Action" htmlFor="adjustment-action">
              <Select
                id="adjustment-action"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="add">Add Stock (+)</option>
                <option value="subtract">Reduce Stock (−)</option>
              </Select>
            </Field>
            <Field label={`Quantity (${unit})`} htmlFor="adjustment-quantity">
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

          <Field label="Reason" htmlFor="adjustment-reason" required>
            <Select id="adjustment-reason" name="reason" required defaultValue="Opening Stock">
              <option value="Opening Stock">Opening Stock</option>
              <option value="Correction">Correction</option>
              <option value="Damage">Damage</option>
              <option value="Loss">Loss</option>
              <option value="Other">Other</option>
            </Select>
          </Field>

          <div
            className="flex items-center justify-between rounded-input border border-border bg-gray-50 px-4 py-3"
            aria-live="polite"
          >
            <span className="text-sm font-medium text-gray-600">
              Resulting Stock ({currentStock} {adjustmentType === 'add' ? '+' : '−'} {quantity})
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
            {loading ? 'Adjusting…' : 'Confirm Adjustment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
