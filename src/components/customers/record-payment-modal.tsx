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
  const { t, formatCurrency, language } = useTranslation();
  const fmt = (n: number) => formatCurrency(n);
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const buttonLabel = label || t('customers.recordPayment', 'Record Payment');

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
          aria-label={language === 'UR' ? `${customerName} سے ادائیگی وصول کریں` : `Record payment from ${customerName}`}
          title={t('customers.recordPayment', 'Record payment')}
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
        title={t('customers.recordPayment', 'Record Payment')}
        description={language === 'UR' ? `${customerName} سے ادھار کی وصولی درج کریں۔` : `Receive a udhaar payment from ${customerName}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" form="record-payment-form" variant="success" loading={loading}>
              {loading ? (language === 'UR' ? 'اندراج جاری ہے…' : 'Recording…') : (language === 'UR' ? 'ادائیگی کی تصدیق کریں' : 'Confirm Payment')}
            </Button>
          </>
        }
      >
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert tone="danger" title={language === 'UR' ? 'ادائیگی درج نہیں ہو سکی' : 'Could not record payment'}>
              {error}
            </Alert>
          )}

          <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-gray-50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t('customers.currentBalance', 'Current Outstanding')}
              </p>
              <p className="text-xs text-muted">{language === 'UR' ? 'اس گاہک کا کل واجب الادا ادھار' : 'Total udhaar due from this customer'}</p>
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
              {language === 'UR'
                ? 'اس گاہک پر فی الحال کوئی ادھار واجب الادا نہیں ہے۔ آپ پیشگی ادائیگی (ایڈوانس) درج کر سکتے ہیں۔'
                : 'This customer has no outstanding udhaar right now. You can still record a payment if they are paying in advance.'}
            </Alert>
          )}

          <Field
            label={t('customers.paymentAmount', 'Payment Amount')}
            htmlFor={fieldId('amount')}
            required
            error={!amountValid && amount !== '' ? (language === 'UR' ? 'رقم صفر سے زیادہ ہونی چاہیے۔' : 'Amount must be greater than 0.') : undefined}
          >
            <div className="relative">
              <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                {language === 'UR' ? 'روپے' : 'Rs.'}
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
              {language === 'UR' ? `پوری رقم منتخب کریں (${fmt(currentOutstanding)})` : `Set full balance (${fmt(currentOutstanding)})`}
            </button>
          )}

          {exceedsOutstanding && (
            <Alert tone="warning">
              {language === 'UR'
                ? `یہ رقم موجودہ واجب الادا ادھار (${fmt(currentOutstanding)}) سے زیادہ ہے۔`
                : `This amount exceeds the current outstanding balance of ${fmt(currentOutstanding)}.`}
            </Alert>
          )}

          {projectedBalance !== null && (
            <div
              className="space-y-1.5 rounded-card border border-dashed border-border bg-gray-50 p-4"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{t('customers.currentBalance', 'Current Outstanding')}</span>
                <span className="font-semibold text-gray-900">{fmt(currentOutstanding)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{t('customers.paymentAmount', 'Payment Amount')}</span>
                <span className="font-semibold text-gray-900">− {fmt(parsedAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-1.5 text-sm">
                <span className="font-semibold text-gray-700">{t('customers.balanceDue', 'Remaining Balance')}</span>
                <span
                  className={cn(
                    'font-bold',
                    projectedBalance > 0 ? 'text-warning' : 'text-success',
                  )}
                >
                  {projectedBalance > 0 ? fmt(projectedBalance) : (language === 'UR' ? '0 روپے (بے باق)' : 'Rs. 0 (Settled)')}
                </span>
              </div>
              {projectedBalance < 0 && (
                <p className="text-xs text-muted">
                  {language === 'UR'
                    ? `اس میں ${fmt(Math.abs(projectedBalance))} کی پیشگی رقم (ایڈوانس) شامل ہے جو آئندہ ادھار میں منہا ہو گی۔`
                    : `Includes an advance payment of ${fmt(Math.abs(projectedBalance))} that will be adjusted against future udhaar.`}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('pos.paymentMethod', 'Payment Method')} htmlFor={fieldId('method')}>
              <Select id={fieldId('method')} name="method" defaultValue="CASH">
                <option value="CASH">{t('pos.cash', 'Cash')}</option>
                <option value="BANK_TRANSFER">{language === 'UR' ? 'بینک ٹرانسفر / آن لائن' : 'Bank Transfer / Online'}</option>
                <option value="MOBILE_WALLET">{language === 'UR' ? 'ایزی پیسہ / جاز کیش / والیٹ' : 'EasyPaisa / JazzCash / Mobile Wallet'}</option>
                <option value="CARD">{t('pos.card', 'Card')}</option>
              </Select>
            </Field>

            <Field label={t('common.notes', 'Notes')} htmlFor={fieldId('notes')}>
              <Input
                id={fieldId('notes')}
                name="notes"
                maxLength={500}
                placeholder={language === 'UR' ? 'تفصیل یا رسید نمبر' : 'Optional memo'}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}
