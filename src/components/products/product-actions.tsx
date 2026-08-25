'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Eye, Pencil } from 'lucide-react';
import { archiveProductAction } from '@/app/actions/product.actions';
import { Modal } from '@/components/ui/modal';
import { Button, IconButton, buttonClasses, type ButtonSize } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { ProductEditDialog, type ProductEditData } from './product-edit-dialog';

export type ProductActionData = ProductEditData;

export function ProductActions({
  businessId,
  product,
  categories,
  canManage,
  size = 'sm',
}: {
  businessId: string;
  product: ProductActionData;
  categories: { id: string; name: string }[];
  canManage: boolean;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<'none' | 'edit' | 'archive'>('none');
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      const res = await archiveProductAction(businessId, product.id);
      if (!res.success) {
        setArchiveError(res.message || 'Failed to archive product');
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

  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard/inventory/${product.id}`}
        aria-label={`View stock activity for ${product.name}`}
        title="View stock activity"
        className={cn(
          buttonClasses('ghost', size),
          size === 'lg' ? 'h-10 w-10 p-0' : 'h-8 w-8 p-0',
        )}
      >
        <Eye className={iconSize} aria-hidden="true" />
      </Link>

      {canManage && (
        <>
          <IconButton
            size={size}
            aria-label={`Edit ${product.name}`}
            title="Edit product"
            onClick={() => setDialog('edit')}
          >
            <Pencil className={iconSize} aria-hidden="true" />
          </IconButton>
          <IconButton
            size={size}
            aria-label={`Archive ${product.name}`}
            title="Archive product"
            onClick={() => {
              setArchiveError('');
              setDialog('archive');
            }}
          >
            <Archive className={iconSize} aria-hidden="true" />
          </IconButton>
        </>
      )}

      {dialog === 'edit' && (
        <ProductEditDialog
          businessId={businessId}
          product={product}
          categories={categories}
          onClose={() => setDialog('none')}
        />
      )}

      {dialog === 'archive' && (
        <Modal
          open
          onClose={() => {
            if (!archiving) setDialog('none');
          }}
          title="Archive product?"
          description="Archived products are deactivated and hidden from active lists."
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDialog('none')}
                disabled={archiving}
              >
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
              <Alert tone="danger" title="Could not archive product">
                {archiveError}
              </Alert>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">“{product.name}”</span> will be marked as
              archived. Its stock level, stock history and sales records are preserved, but it will no
              longer count as an active product.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
