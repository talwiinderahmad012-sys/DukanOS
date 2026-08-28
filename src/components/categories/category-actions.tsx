'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Pencil } from 'lucide-react';
import { archiveCategoryAction } from '@/app/actions/category.actions';
import { Modal } from '@/components/ui/modal';
import { Button, IconButton, type ButtonSize } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { CategoryFormDialog, type CategoryEditData } from './category-form-dialog';
import { useTranslation } from '@/lib/i18n/language-context';

export function CategoryActions({
  businessId,
  category,
  productCount,
  canManage,
  size = 'sm',
}: {
  businessId: string;
  category: CategoryEditData & { isActive: boolean };
  productCount: number;
  canManage: boolean;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [dialog, setDialog] = useState<'none' | 'edit' | 'archive'>('none');
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  if (!canManage) return null;

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      const res = await archiveCategoryAction(businessId, category.id);
      if (!res.success) {
        setArchiveError(tm(res.message) || t('categories.archiveFailed'));
        setArchiving(false);
        return;
      }
      setDialog('none');
      router.refresh();
    } catch {
      setArchiveError(t('categories.unexpectedError'));
      setArchiving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton
        size={size}
        aria-label={t('categories.editAria', { name: category.name })}
        title={t('categories.editTitle')}
        onClick={() => setDialog('edit')}
      >
        <Pencil className={iconSize} aria-hidden="true" />
      </IconButton>
      {category.isActive && (
        <IconButton
          size={size}
          aria-label={t('categories.archiveAria', { name: category.name })}
          title={t('categories.archiveTitle')}
          onClick={() => {
            setArchiveError('');
            setDialog('archive');
          }}
        >
          <Archive className={iconSize} aria-hidden="true" />
        </IconButton>
      )}

      {dialog === 'edit' && (
        <CategoryFormDialog businessId={businessId} category={category} onClose={() => setDialog('none')} />
      )}

      {dialog === 'archive' && (
        <Modal
          open
          onClose={() => {
            if (!archiving) setDialog('none');
          }}
          title={t('categories.archiveConfirm')}
          description={t('categories.archiveDescription')}
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog('none')} disabled={archiving}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleArchive} loading={archiving}>
                {t('categories.archive')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {archiveError && (
              <Alert tone="danger" title={t('categories.couldNotArchiveCategory')}>
                {archiveError}
              </Alert>
            )}
            <p className="text-sm text-gray-600">
              {t('categories.archiveDetailPrefix', { name: category.name })}{' '}
              {productCount > 0
                ? t('categories.archiveWithProducts', { count: productCount })
                : t('categories.archiveNoProducts')}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
