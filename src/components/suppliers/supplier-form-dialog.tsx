'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createSupplierAction, updateSupplierAction } from '@/app/actions/supplier.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/language-context';

export type SupplierEditData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

export function SupplierFormDialog({
  businessId,
  supplier = null,
  onClose,
}: {
  businessId: string;
  supplier?: SupplierEditData | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isEdit = supplier !== null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name'),
      phone: (fd.get('phone') as string) || null,
      email: (fd.get('email') as string) || null,
      address: (fd.get('address') as string) || null,
      notes: (fd.get('notes') as string) || null,
    };

    try {
      const res = isEdit
        ? await updateSupplierAction(businessId, supplier.id, payload)
        : await createSupplierAction(businessId, payload);

      if (!res.success) {
        setFieldErrors(res.fieldErrors ?? {});
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(tm(res.message || fieldError) || t('suppliers.saveFailed'));
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError(t('suppliers.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!loading) onClose();
      }}
      title={isEdit ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
      description={
        isEdit
          ? t('suppliers.editDialogDescription', { name: supplier.name })
          : t('suppliers.addDialogDescription')
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="supplier-form-dialog" loading={loading}>
            {isEdit ? t('suppliers.saveChanges') : t('suppliers.saveSupplier')}
          </Button>
        </>
      }
    >
      <form id="supplier-form-dialog" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert tone="danger" title={t('suppliers.couldNotSaveSupplier')}>
            {error}
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby={`${idPrefix}-info`}>
          <div>
            <h3 id={`${idPrefix}-info`} className="text-sm font-bold text-gray-900">
              {t('suppliers.supplierInformation')}
            </h3>
            <p className="text-xs text-muted">{t('suppliers.nameHint')}</p>
          </div>

          <Field
            label={t('suppliers.supplierName')}
            htmlFor={fieldId('name')}
            required
            error={tm(fieldErrors.name?.[0])}
          >
            <Input
              id={fieldId('name')}
              name="name"
              required
              maxLength={100}
              defaultValue={supplier?.name ?? ''}
              placeholder={t('suppliers.namePlaceholder')}
              invalid={Boolean(fieldErrors.name?.length)}
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-contact`}>
          <div>
            <h3 id={`${idPrefix}-contact`} className="text-sm font-bold text-gray-900">
              {t('suppliers.contact')}
            </h3>
            <p className="text-xs text-muted">{t('suppliers.contactHint')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('common.phone')}
              htmlFor={fieldId('phone')}
              error={tm(fieldErrors.phone?.[0])}
            >
              <Input
                id={fieldId('phone')}
                name="phone"
                type="tel"
                maxLength={20}
                defaultValue={supplier?.phone ?? ''}
                placeholder={t('suppliers.phonePlaceholder')}
                invalid={Boolean(fieldErrors.phone?.length)}
              />
            </Field>
            <Field
              label={t('common.email')}
              htmlFor={fieldId('email')}
              error={tm(fieldErrors.email?.[0])}
            >
              <Input
                id={fieldId('email')}
                name="email"
                type="email"
                defaultValue={supplier?.email ?? ''}
                placeholder={t('suppliers.emailPlaceholder')}
                invalid={Boolean(fieldErrors.email?.length)}
              />
            </Field>
          </div>

          <Field
            label={t('common.address')}
            htmlFor={fieldId('address')}
            error={tm(fieldErrors.address?.[0])}
          >
            <Textarea
              id={fieldId('address')}
              name="address"
              maxLength={300}
              rows={2}
              defaultValue={supplier?.address ?? ''}
              placeholder={t('suppliers.addressPlaceholder')}
              invalid={Boolean(fieldErrors.address?.length)}
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-additional`}>
          <div>
            <h3 id={`${idPrefix}-additional`} className="text-sm font-bold text-gray-900">
              {t('suppliers.additionalInformation')}
            </h3>
            <p className="text-xs text-muted">{t('suppliers.notesHint')}</p>
          </div>

          <Field
            label={t('common.notes')}
            htmlFor={fieldId('notes')}
            error={tm(fieldErrors.notes?.[0])}
          >
            <Textarea
              id={fieldId('notes')}
              name="notes"
              maxLength={500}
              rows={3}
              defaultValue={supplier?.notes ?? ''}
              placeholder={t('suppliers.notesPlaceholder')}
              invalid={Boolean(fieldErrors.notes?.length)}
            />
          </Field>
        </section>
      </form>
    </Modal>
  );
}

export function AddSupplierButton({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses('primary', 'sm')}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('suppliers.addSupplier')}
      </button>
      {open && <SupplierFormDialog businessId={businessId} onClose={() => setOpen(false)} />}
    </>
  );
}
