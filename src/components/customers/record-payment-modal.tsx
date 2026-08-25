'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote } from 'lucide-react';
import { recordCustomerPaymentAction } from '@/app/actions/customer.actions';
import { Modal } from '@/components/ui/modal';
import { Button, IconButton, type ButtonSize, type ButtonVariant } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select } from '@/components/ui/input';

const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

export function RecordPaymentModal({
  businessId,
  customerId,
  customerName,
  currentOutstanding,
  iconOnly = false,
  variant = 'success',
  size = 'md',
  label = 'Record Payment',
}: {
  businessId: string;
  customerId: string;
  customerName: string;
  currentOutstanding: number;
  iconOnly?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
}) {
  const router = useRouter();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = Number(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const exceedsOutstanding =
    amountValid && currentOutstanding > 0 && parsedAmount > currentOutstanding;

  function open() {
    setAmount('');
    setError('');
    setIsOpen(true);
  }

  function close() {
    if (loading) return;
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!amountValid) {
      setError('Enter a payment amount greater than 0.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    try {
      const res = await recordCustomerPaymentAction(businessId, {
        customerId,
        amount: parsedAmount,
        method: formData.get('method') as string,
        notes: ((formData.get('notes') as string) || '').trim() || undefined,
      });

      if (!res.success) {
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(res.message || fieldError || 'Failed to record customer payment.');
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <>
      {iconOnly ? (
        <IconButton
          size={size}
          variant={variant}
          aria-label={`Record payment from ${customerName}`}
          title="Record payment"
          onClick={open}
        >
          <Banknote className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
        </IconButton>
      ) : (
        <Button size={size} variant={variant} onClick={open}>
          <Banknote className="h-4 w-4" aria-hidden="true" />
          {label}
        </Button>
      )}

      <Modal
        open={isOpen}
        onClose={close}
        title="Record Payment"
        description={`Receive a udhaar payment from ${customerName}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form="record-payment-form" variant="success" loading={loading}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert tone="danger" title="Could not record payment">
              {error}
            </Alert>
          )}

          <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-gray-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Current Outstanding
              </p>
              <p className="text-xs text-muted">Total udhaar due from this customer</p>
            </div>
            <p
              className={
                currentOutstanding > 0
                  ? 'text-lg font-bold text-warning'
                  : 'text-lg font-bold text-success'
              }
            >
              {fmt(currentOutstanding)}
            </p>
          </div>

          {currentOutstanding <= 0 && (
            <Alert tone="info">
              This customer has no outstanding udhaar right now. You can still record a payment if
              they are paying in advance.
            </Alert>
          )}

          <Field
            label="Payment Amount"
            htmlFor={fieldId('amount')}
            required
            error={!amountValid && amount !== '' ? 'Amount must be greater than 0.' : undefined}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                Rs.
              </span>
              <Input
                id={fieldId('amount')}
                name="amount"
                type="number"
                min="1"
                step="0.01"
                required
                autoFocus
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                invalid={!amountValid && amount !== ''}
                className="pl-11"
              />
            </div>
          </Field>

          {currentOutstanding > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(currentOutstanding))}
              className="text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Set full balance ({fmt(currentOutstanding)})
            </button>
          )}

          {exceedsOutstanding && (
            <Alert tone="warning">
              This amount exceeds the current outstanding balance of {fmt(currentOutstanding)}.
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Payment Method" htmlFor={fieldId('method')}>
              <Select id={fieldId('method')} name="method" defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer / Online</option>
                <option value="MOBILE_WALLET">EasyPaisa / JazzCash / Mobile Wallet</option>
                <option value="CARD">Card</option>
              </Select>
            </Field>

            <Field label="Notes" htmlFor={fieldId('notes')}>
              <Input
                id={fieldId('notes')}
                name="notes"
                maxLength={500}
                placeholder="Optional memo"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
