'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createCustomerAction } from '@/app/actions/customer.actions';
import { Modal } from '@/components/ui/modal';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui/input';

import { useTranslation } from '@/lib/i18n/language-context';

export function AddCustomerButton({
  businessId,
  variant = 'primary',
  size = 'sm',
}: {
  businessId: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function close() {
    if (loading) return;
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const payload = {
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    };

    try {
      const res = await createCustomerAction(businessId, payload);

      if (!res.success) {
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(res.message || fieldError || (language === 'UR' ? 'گاہک شامل کرنے میں ناکامی' : 'Failed to create customer'));
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch {
      setError(language === 'UR' ? 'غیر متوقع خرابی پیش آ گئی' : 'An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setIsOpen(true)}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('customers.addCustomer', 'Add Customer')}
      </Button>

      <Modal
        open={isOpen}
        onClose={close}
        title={t('customers.addCustomer', 'Add Customer')}
        description={language === 'UR' ? 'فروخت، ادھار اور ادائیگیوں کے حساب کے لیے گاہک کا پروفائل بنائیں۔' : 'Create a customer profile to track sales, udhaar and payments.'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" form="customer-create-form" loading={loading}>
              {loading ? (language === 'UR' ? 'محفوظ ہو رہا ہے…' : 'Saving…') : (language === 'UR' ? 'گاہک محفوظ کریں' : 'Save Customer')}
            </Button>
          </>
        }
      >
        <form id="customer-create-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert tone="danger" title={language === 'UR' ? 'گاہک شامل نہیں ہو سکا' : 'Could not create customer'}>
              {error}
            </Alert>
          )}

          <Field label={t('customers.customerName', 'Customer Name')} htmlFor={fieldId('name')} required>
            <Input
              id={fieldId('name')}
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoFocus
              placeholder={language === 'UR' ? 'مثلاً طارق محمود' : 'e.g. Tariq Mehmood'}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('customers.phoneNumber', 'Phone')} htmlFor={fieldId('phone')}>
              <Input
                id={fieldId('phone')}
                name="phone"
                type="tel"
                maxLength={20}
                placeholder="0300-1234567"
              />
            </Field>

            <Field label={t('common.email', 'Email')} htmlFor={fieldId('email')}>
              <Input
                id={fieldId('email')}
                name="email"
                type="email"
                maxLength={100}
                placeholder="customer@example.com"
              />
            </Field>
          </div>

          <Field label={t('common.address', 'Address')} htmlFor={fieldId('address')}>
            <Textarea
              id={fieldId('address')}
              name="address"
              maxLength={300}
              rows={2}
              placeholder={language === 'UR' ? 'دکان / رہائشی پتہ' : 'Shop / home address'}
            />
          </Field>

          <Field label={t('common.notes', 'Notes')} htmlFor={fieldId('notes')}>
            <Textarea
              id={fieldId('notes')}
              name="notes"
              maxLength={500}
              rows={2}
              placeholder={language === 'UR' ? 'گاہک کے بارے میں کوئی اضافی نوٹ' : 'Optional notes about this customer'}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
