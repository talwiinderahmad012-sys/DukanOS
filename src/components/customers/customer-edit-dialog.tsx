'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerAction } from '@/app/actions/customer.actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/language-context';

export type CustomerEditableData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
};

export function CustomerEditDialog({
  businessId,
  customer,
  onClose,
}: {
  businessId: string;
  customer: CustomerEditableData;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const payload = {
      name: (formData.get('name') as string) || undefined,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      notes: (formData.get('notes') as string) || null,
      status: formData.get('status') as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
    };

    try {
      const res = await updateCustomerAction(businessId, customer.id, payload);

      if (!res.success) {
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(tm(res.message || fieldError) || t('customers.updateCustomerFailed'));
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError(t('customers.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!loading) onClose();
      }}
      title={t('customers.editCustomer')}
      description={t('customers.editDialogDescription', { name: customer.name })}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="customer-edit-form" loading={loading}>
            {t('customers.saveChanges')}
          </Button>
        </>
      }
    >
      <form id="customer-edit-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert tone="danger" title={t('customers.couldNotSaveCustomer')}>
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
            defaultValue={customer.name}
            placeholder={t('customers.namePlaceholder')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('common.phone')} htmlFor={fieldId('phone')}>
            <Input
              id={fieldId('phone')}
              name="phone"
              type="tel"
              maxLength={20}
              defaultValue={customer.phone ?? ''}
              placeholder="0300-1234567"
            />
          </Field>

          <Field label={t('common.email')} htmlFor={fieldId('email')}>
            <Input
              id={fieldId('email')}
              name="email"
              type="email"
              maxLength={100}
              defaultValue={customer.email ?? ''}
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
            defaultValue={customer.address ?? ''}
            placeholder={t('customers.addressPlaceholder')}
          />
        </Field>

        <Field label={t('common.notes')} htmlFor={fieldId('notes')}>
          <Textarea
            id={fieldId('notes')}
            name="notes"
            maxLength={500}
            rows={2}
            defaultValue={customer.notes ?? ''}
            placeholder={t('customers.notesPlaceholder')}
          />
        </Field>

        <Field
          label={t('common.status')}
          htmlFor={fieldId('status')}
          hint={t('customers.statusHint')}
        >
          <Select id={fieldId('status')} name="status" defaultValue={customer.status}>
            <option value="ACTIVE">{t('customers.statusActive')}</option>
            <option value="INACTIVE">{t('customers.statusInactive')}</option>
            <option value="ARCHIVED">{t('customers.statusArchived')}</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
