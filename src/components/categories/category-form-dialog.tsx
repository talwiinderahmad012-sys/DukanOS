'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createCategoryAction, updateCategoryAction } from '@/app/actions/category.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui/input';

export type CategoryEditData = {
  id: string;
  name: string;
  description: string | null;
};

export function CategoryFormDialog({
  businessId,
  category = null,
  onClose,
}: {
  businessId: string;
  category?: CategoryEditData | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isEdit = category !== null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name'),
      description: fd.get('description'),
    };

    try {
      const res = isEdit
        ? await updateCategoryAction(businessId, category.id, payload)
        : await createCategoryAction(businessId, payload);

      if (!res.success) {
        setFieldErrors(res.fieldErrors ?? {});
        const fieldError = res.fieldErrors
          ? Object.values(res.fieldErrors).flat().find(Boolean)
          : undefined;
        setError(res.message || fieldError || 'Failed to save category');
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
      title={isEdit ? 'Edit Category' : 'Add Category'}
      description={
        isEdit
          ? `Update the name and description of “${category.name}”.`
          : 'Create a category to group related products.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="category-form-dialog" loading={loading}>
            {isEdit ? 'Save Changes' : 'Save Category'}
          </Button>
        </>
      }
    >
      <form id="category-form-dialog" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert tone="danger" title="Could not save category">
            {error}
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby={`${idPrefix}-basic`}>
          <div>
            <h3 id={`${idPrefix}-basic`} className="text-sm font-bold text-gray-900">
              Basic Information
            </h3>
            <p className="text-xs text-muted">
              Categories appear when assigning products on the Products page.
            </p>
          </div>

          <Field
            label="Category Name"
            htmlFor={fieldId('name')}
            required
            error={fieldErrors.name?.[0]}
          >
            <Input
              id={fieldId('name')}
              name="name"
              required
              maxLength={100}
              defaultValue={category?.name ?? ''}
              placeholder="e.g. Beverages"
              invalid={Boolean(fieldErrors.name?.length)}
            />
          </Field>

          <Field
            label="Description"
            htmlFor={fieldId('description')}
            error={fieldErrors.description?.[0]}
          >
            <Textarea
              id={fieldId('description')}
              name="description"
              maxLength={300}
              rows={3}
              defaultValue={category?.description ?? ''}
              placeholder="Optional details about this category"
              invalid={Boolean(fieldErrors.description?.length)}
            />
          </Field>
        </section>
      </form>
    </Modal>
  );
}

export function AddCategoryButton({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses('primary', 'sm')}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add Category
      </button>
      {open && <CategoryFormDialog businessId={businessId} onClose={() => setOpen(false)} />}
    </>
  );
}
