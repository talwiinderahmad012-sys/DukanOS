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
import { useTranslation } from '@/lib/i18n/language-context';
import { getLocalizedValue } from '@/lib/translation/localized';

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
  const { language, t, tm } = useTranslation();
  const [dialog, setDialog] = useState<'none' | 'edit' | 'archive'>('none');
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const displayName = getLocalizedValue(product, 'name', language) ?? product.name;

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      const res = await archiveProductAction(businessId, product.id);
      if (!res.success) {
        setArchiveError(tm(res.message) || t('products.archiveFailed'));
        setArchiving(false);
        return;
      }
      setDialog('none');
      router.refresh();
    } catch {
      setArchiveError(t('products.unexpectedError'));
      setArchiving(false);
    }
  }

  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard/inventory/${product.id}`}
        aria-label={t('products.viewStockActivityFor', { name: displayName })}
        title={t('products.viewStockActivity')}
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
            aria-label={t('products.editProductAria', { name: displayName })}
            title={t('products.editProductTitle')}
            onClick={() => setDialog('edit')}
          >
            <Pencil className={iconSize} aria-hidden="true" />
          </IconButton>
          <IconButton
            size={size}
            aria-label={t('products.archiveProductAria', { name: displayName })}
            title={t('products.archiveProductTitle')}
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
          title={t('products.archiveProductConfirm')}
          description={t('products.archiveProductDescription')}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDialog('none')}
                disabled={archiving}
              >
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleArchive} loading={archiving}>
                {t('products.archive')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {archiveError && (
              <Alert tone="danger" title={t('products.couldNotArchiveProduct')}>
                {archiveError}
              </Alert>
            )}
            <p className="text-sm text-gray-600">
              {t('products.archiveProductDetail', { name: displayName })}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
