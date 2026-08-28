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
  const { t, tm } = useTranslation();
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
        setError(tm(res.message || fieldError) || t('customers.createCustomerFailed'));
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
      <Button size={size} variant={variant} onClick={() => setIsOpen(true)}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('customers.addCustomer')}
      </Button>

      <Modal
        open={isOpen}
        onClose={close}
        title={t('customers.addCustomer')}
        description={t('customers.addDialogDescription')}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="customer-create-form" loading={loading}>
              {loading ? t('common.saving') : t('customers.saveCustomer')}
            </Button>
          </>
        }
      >
        <form id="customer-create-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert tone="danger" title={t('customers.couldNotCreateCustomer')}>
              {error}
            </Alert>
          )}

          <Field label={t('customers.customerName')} htmlFor={fieldId('name')} required>
            <Input
              id={fieldId('name')}
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoFocus
              placeholder={t('customers.namePlaceholder')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('customers.phoneNumber')} htmlFor={fieldId('phone')}>
              <Input
                id={fieldId('phone')}
                name="phone"
                type="tel"
                maxLength={20}
                placeholder="0300-1234567"
              />
            </Field>

            <Field label={t('common.email')} htmlFor={fieldId('email')}>
              <Input
                id={fieldId('email')}
                name="email"
                type="email"
                maxLength={100}
                placeholder="customer@example.com"
              />
            </Field>
          </div>

          <Field label={t('common.address')} htmlFor={fieldId('address')}>
            <Textarea
              id={fieldId('address')}
              name="address"
              maxLength={300}
              rows={2}
              placeholder={t('customers.addressPlaceholder')}
            />
          </Field>

          <Field label={t('common.notes')} htmlFor={fieldId('notes')}>
            <Textarea
              id={fieldId('notes')}
              name="notes"
              maxLength={500}
              rows={2}
              placeholder={t('customers.notesPlaceholder')}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
