'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createCustomerAction } from '@/app/actions/customer.actions';
import { Modal } from '@/components/ui/modal';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui/input';

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
        setError(res.message || fieldError || 'Failed to create customer');
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
      <Button size={size} variant={variant} onClick={() => setIsOpen(true)}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add Customer
      </Button>

      <Modal
        open={isOpen}
        onClose={close}
        title="Add Customer"
        description="Create a customer profile to track sales, udhaar and payments."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form="customer-create-form" loading={loading}>
              Save Customer
            </Button>
          </>
        }
      >
        <form id="customer-create-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert tone="danger" title="Could not create customer">
              {error}
            </Alert>
          )}

          <Field label="Customer Name" htmlFor={fieldId('name')} required>
            <Input
              id={fieldId('name')}
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoFocus
              placeholder="e.g. Tariq Mehmood"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor={fieldId('phone')}>
              <Input
                id={fieldId('phone')}
                name="phone"
                type="tel"
                maxLength={20}
                placeholder="0300-1234567"
              />
            </Field>

            <Field label="Email" htmlFor={fieldId('email')}>
              <Input
                id={fieldId('email')}
                name="email"
                type="email"
                maxLength={100}
                placeholder="customer@example.com"
              />
            </Field>
          </div>

          <Field label="Address" htmlFor={fieldId('address')}>
            <Textarea
              id={fieldId('address')}
              name="address"
              maxLength={300}
              rows={2}
              placeholder="Shop / home address"
            />
          </Field>

          <Field label="Notes" htmlFor={fieldId('notes')}>
            <Textarea
              id={fieldId('notes')}
              name="notes"
              maxLength={500}
              rows={2}
              placeholder="Optional notes about this customer"
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
