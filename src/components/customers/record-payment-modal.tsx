'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote } from 'lucide-react';
import { recordCustomerPaymentAction } from '@/app/actions/customer.actions';
import { Modal } from '@/components/ui/modal';
import { Button, IconButton, type ButtonSize, type ButtonVariant } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select } from '@/components/ui/input';
import { cn } from '@/components/ui/cn';

import { useTranslation } from '@/lib/i18n/language-context';

export function RecordPaymentModal({
  businessId,
  customerId,
  customerName,
  currentOutstanding,
  iconOnly = false,
  variant = 'success',
  size = 'md',
  label,
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
  const { t, tm, formatCurrency } = useTranslation();
  const fmt = (n: number) => formatCurrency(n);
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const buttonLabel = label || t('customers.recordPayment');

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = Number(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const exceedsOutstanding =
    amountValid && currentOutstanding > 0 && parsedAmount > currentOutstanding;
  const projectedBalance = amountValid ? currentOutstanding - parsedAmount : null;

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
      setError(t('customers.amountError'));
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
        setError(tm(res.message || fieldError) || t('customers.recordPaymentFailed'));
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch {
      setError(t('customers.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <>
      {iconOnly ? (
        <IconButton
          size={size}
          variant={variant}
          aria-label={t('customers.recordPaymentAria', { name: customerName })}
          title={t('customers.recordPayment')}
          onClick={open}
        >
          <Banknote className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
        </IconButton>
      ) : (
        <Button size={size} variant={variant} onClick={open}>
          <Banknote className="h-4 w-4" aria-hidden="true" />
          {buttonLabel}
        </Button>
      )}

      <Modal
        open={isOpen}
        onClose={close}
        title={t('customers.recordPayment')}
        description={t('customers.recordPaymentDescription', { name: customerName })}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="record-payment-form" variant="success" loading={loading}>
              {loading ? t('customers.recording') : t('customers.confirmPayment')}
            </Button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert tone="danger" title={t('customers.couldNotRecordPayment')}>
              {error}
            </Alert>
          )}

          <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-gray-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t('customers.currentBalance')}
              </p>
              <p className="text-xs text-muted">{t('customers.totalUdhaarDue')}</p>
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
              {t('customers.noOutstandingInfo')}
            </Alert>
          )}

          <Field
            label={t('customers.paymentAmount')}
            htmlFor={fieldId('amount')}
            required
            error={!amountValid && amount !== '' ? t('customers.amountMustBePositive') : undefined}
          >
            <div className="relative">
              <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {t('common.pkr')}
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
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                invalid={!amountValid && amount !== ''}
                className="ps-12"
              />
            </div>
          </Field>

          {currentOutstanding > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(currentOutstanding))}
              className="text-sm font-semibold text-primary hover:text-primary-hover"
            >
              {t('customers.setFullBalance', { amount: fmt(currentOutstanding) })}
            </button>
          )}

          {exceedsOutstanding && (
            <Alert tone="warning">
              {t('customers.exceedsOutstandingWarning', { amount: fmt(currentOutstanding) })}
            </Alert>
          )}

          {projectedBalance !== null && (
            <div
              className="space-y-1.5 rounded-card border border-dashed border-border bg-gray-50 p-4"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{t('customers.currentBalance')}</span>
                <span className="font-semibold text-gray-900">{fmt(currentOutstanding)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{t('customers.paymentAmount')}</span>
                <span className="font-semibold text-gray-900">− {fmt(parsedAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-1.5 text-sm">
                <span className="font-semibold text-gray-700">{t('customers.balanceDue')}</span>
                <span
                  className={cn(
                    'font-bold',
                    projectedBalance > 0 ? 'text-warning' : 'text-success',
                  )}
                >
                  {projectedBalance > 0 ? fmt(projectedBalance) : t('customers.zeroSettled', { amount: fmt(0) })}
                </span>
              </div>
              {projectedBalance < 0 && (
                <p className="text-xs text-muted">
                  {t('customers.advanceNote', { amount: fmt(Math.abs(projectedBalance)) })}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('pos.paymentMethod')} htmlFor={fieldId('method')}>
              <Select id={fieldId('method')} name="method" defaultValue="CASH">
                <option value="CASH">{t('pos.cash')}</option>
                <option value="BANK_TRANSFER">{t('customers.methodBankTransferOnline')}</option>
                <option value="MOBILE_WALLET">{t('customers.methodMobileWallet')}</option>
                <option value="CARD">{t('pos.card')}</option>
              </Select>
            </Field>

            <Field label={t('common.notes')} htmlFor={fieldId('notes')}>
              <Input
                id={fieldId('notes')}
                name="notes"
                maxLength={500}
                placeholder={t('customers.paymentNotesPlaceholder')}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
