'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Pencil } from 'lucide-react';
import { archiveCategoryAction } from '@/app/actions/category.actions';
import { Modal } from '@/components/ui/modal';
import { Button, IconButton, type ButtonSize } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { CategoryFormDialog, type CategoryEditData } from './category-form-dialog';

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
        setArchiveError(res.message || 'Failed to archive category');
        setArchiving(false);
        return;
      }
      setDialog('none');
      router.refresh();
    } catch {
      setArchiveError('An unexpected error occurred.');
      setArchiving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton
        size={size}
        aria-label={`Edit ${category.name}`}
        title="Edit category"
        onClick={() => setDialog('edit')}
      >
        <Pencil className={iconSize} aria-hidden="true" />
      </IconButton>
      {category.isActive && (
        <IconButton
          size={size}
          aria-label={`Archive ${category.name}`}
          title="Archive category"
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
          title="Archive category?"
          description="Archived categories are hidden from active lists."
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog('none')} disabled={archiving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleArchive} loading={archiving}>
                Archive
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {archiveError && (
              <Alert tone="danger" title="Could not archive category">
                {archiveError}
              </Alert>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">“{category.name}”</span> will be marked
              as archived.{' '}
              {productCount > 0
                ? `${productCount} assigned product${productCount === 1 ? '' : 's'} remain${productCount === 1 ? 's' : ''} in your catalog and keep their records, but the category will no longer appear in active category lists.`
                : 'No products are assigned to this category, so nothing else is affected.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
