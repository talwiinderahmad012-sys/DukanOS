'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createCategoryAction, updateCategoryAction } from '@/app/actions/category.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/language-context';
import { AutoTranslationHint } from '@/components/translation/auto-translation-hint';

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
  const { t, tm } = useTranslation();
  const idPrefix = useId();
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [nameValue, setNameValue] = useState(category?.name ?? '');

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
        setError(tm(res.message) || tm(fieldError) || t('categories.saveFailed'));
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError(t('categories.unexpectedError'));
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        if (!loading) onClose();
      }}
      title={isEdit ? t('categories.editCategory') : t('categories.addCategory')}
      description={
        isEdit
          ? t('categories.editDescription', { name: category.name })
          : t('categories.createDescription')
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="category-form-dialog" loading={loading}>
            {isEdit ? t('categories.saveChanges') : t('categories.saveCategory')}
          </Button>
        </>
      }
    >
      <form id="category-form-dialog" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert tone="danger" title={t('categories.couldNotSaveCategory')}>
            {error}
          </Alert>
        )}

        <section className="space-y-4" aria-labelledby={`${idPrefix}-basic`}>
          <div>
            <h3 id={`${idPrefix}-basic`} className="text-sm font-bold text-gray-900">
              {t('categories.basicInformation')}
            </h3>
            <p className="text-xs text-muted">
              {t('categories.basicInformationDescription')}
            </p>
          </div>

          <Field
            label={t('categories.categoryName')}
            htmlFor={fieldId('name')}
            required
            hint={<AutoTranslationHint value={nameValue} />}
            error={tm(fieldErrors.name?.[0]) || undefined}
          >
            <Input
              id={fieldId('name')}
              name="name"
              required
              maxLength={100}
              defaultValue={category?.name ?? ''}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder={t('categories.namePlaceholder')}
              invalid={Boolean(fieldErrors.name?.length)}
            />
          </Field>

          <Field
            label={t('common.description')}
            htmlFor={fieldId('description')}
            error={tm(fieldErrors.description?.[0]) || undefined}
          >
            <Textarea
              id={fieldId('description')}
              name="description"
              maxLength={300}
              rows={3}
              defaultValue={category?.description ?? ''}
              placeholder={t('categories.descriptionPlaceholder')}
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
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses('primary', 'sm')}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('categories.addCategory')}
      </button>
      {open && <CategoryFormDialog businessId={businessId} onClose={() => setOpen(false)} />}
    </>
  );
}
