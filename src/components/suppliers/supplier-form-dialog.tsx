'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createSupplierAction, updateSupplierAction } from '@/app/actions/supplier.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui/input';

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
        setError(res.message || fieldError || 'Failed to save supplier');
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!loading) onClose();
      }}
      title={isEdit ? 'Edit Supplier' : 'Add Supplier'}
      description={
        isEdit
          ? `Update contact details and notes for ${supplier.name}.`
          : 'Add a vendor or distributor to track purchases and payments.'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form-dialog" loading={loading}>
            {isEdit ? 'Save Changes' : 'Save Supplier'}
          </Button>
        </>
      }
    >
      <form id="supplier-form-dialog" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert tone="danger" title="Could not save supplier">
            {error}
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby={`${idPrefix}-info`}>
          <div>
            <h3 id={`${idPrefix}-info`} className="text-sm font-bold text-gray-900">
              Supplier Information
            </h3>
            <p className="text-xs text-muted">The supplier name shown on purchase invoices.</p>
          </div>

          <Field
            label="Supplier Name"
            htmlFor={fieldId('name')}
            required
            error={fieldErrors.name?.[0]}
          >
            <Input
              id={fieldId('name')}
              name="name"
              required
              maxLength={100}
              defaultValue={supplier?.name ?? ''}
              placeholder="e.g. Karachi Wholesale Traders"
              invalid={Boolean(fieldErrors.name?.length)}
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-contact`}>
          <div>
            <h3 id={`${idPrefix}-contact`} className="text-sm font-bold text-gray-900">
              Contact
            </h3>
            <p className="text-xs text-muted">Phone, email and address for this supplier.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Phone"
              htmlFor={fieldId('phone')}
              error={fieldErrors.phone?.[0]}
            >
              <Input
                id={fieldId('phone')}
                name="phone"
                type="tel"
                maxLength={20}
                defaultValue={supplier?.phone ?? ''}
                placeholder="e.g. 0300 1234567"
                invalid={Boolean(fieldErrors.phone?.length)}
              />
            </Field>
            <Field
              label="Email"
              htmlFor={fieldId('email')}
              error={fieldErrors.email?.[0]}
            >
              <Input
                id={fieldId('email')}
                name="email"
                type="email"
                defaultValue={supplier?.email ?? ''}
                placeholder="e.g. orders@supplier.com"
                invalid={Boolean(fieldErrors.email?.length)}
              />
            </Field>
          </div>

          <Field
            label="Address"
            htmlFor={fieldId('address')}
            error={fieldErrors.address?.[0]}
          >
            <Textarea
              id={fieldId('address')}
              name="address"
              maxLength={300}
              rows={2}
              defaultValue={supplier?.address ?? ''}
              placeholder="Shop or warehouse address"
              invalid={Boolean(fieldErrors.address?.length)}
            />
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby={`${idPrefix}-additional`}>
          <div>
            <h3 id={`${idPrefix}-additional`} className="text-sm font-bold text-gray-900">
              Additional Information
            </h3>
            <p className="text-xs text-muted">Internal notes, visible only to your team.</p>
          </div>

          <Field
            label="Notes"
            htmlFor={fieldId('notes')}
            error={fieldErrors.notes?.[0]}
          >
            <Textarea
              id={fieldId('notes')}
              name="notes"
              maxLength={500}
              rows={3}
              defaultValue={supplier?.notes ?? ''}
              placeholder="e.g. Delivers every Tuesday, 30-day credit terms"
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses('primary', 'sm')}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add Supplier
      </button>
      {open && <SupplierFormDialog businessId={businessId} onClose={() => setOpen(false)} />}
    </>
  );
}
