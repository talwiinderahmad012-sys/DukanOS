'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Eye, Pencil } from 'lucide-react';
import { archiveSupplierAction } from '@/app/actions/supplier.actions';
import { Modal } from '@/components/ui/modal';
import { Button, IconButton, buttonClasses, type ButtonSize } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { SupplierFormDialog, type SupplierEditData } from './supplier-form-dialog';
import { useTranslation } from '@/lib/i18n/language-context';

export type SupplierActionData = SupplierEditData & { isActive: boolean };

function ArchiveConfirmModal({
  businessId,
  supplier,
  purchaseCount,
  open,
  onClose,
}: {
  businessId: string;
  supplier: SupplierActionData;
  purchaseCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t, tm } = useTranslation();
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      const res = await archiveSupplierAction(businessId, supplier.id);
      if (!res.success) {
        setArchiveError(tm(res.message) || t('suppliers.archiveFailed'));
        setArchiving(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setArchiveError(t('suppliers.unexpectedError'));
      setArchiving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!archiving) onClose();
      }}
      title={t('suppliers.archiveSupplierTitle')}
      description={t('suppliers.archiveDescription')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={archiving}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleArchive} loading={archiving}>
            {t('suppliers.archive')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {archiveError && (
          <Alert tone="danger" title={t('suppliers.couldNotArchiveSupplier')}>
            {archiveError}
          </Alert>
        )}
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">“{supplier.name}”</span>{' '}
          {t('suppliers.archiveMarkedSuffix')}{' '}
          {purchaseCount > 0
            ? t('suppliers.archiveRecordsIntact', {
                count: purchaseCount,
                recordWord:
                  purchaseCount === 1
                    ? t('suppliers.archiveRecordWordSingular')
                    : t('suppliers.archiveRecordWordPlural'),
              })
            : t('suppliers.archiveNoPurchases')}
        </p>
      </div>
    </Modal>
  );
}

export function SupplierActions({
  businessId,
  supplier,
  purchaseCount,
  canManage,
  size = 'sm',
}: {
  businessId: string;
  supplier: SupplierActionData;
  purchaseCount: number;
  canManage: boolean;
  size?: ButtonSize;
}) {
  const [dialog, setDialog] = useState<'none' | 'edit' | 'archive'>('none');
  const { t } = useTranslation();

  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard/suppliers/${supplier.id}`}
        aria-label={t('suppliers.viewHistoryAria', { name: supplier.name })}
        title={t('suppliers.viewHistory')}
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
            aria-label={t('suppliers.editAria', { name: supplier.name })}
            title={t('suppliers.editSupplierTooltip')}
            onClick={() => setDialog('edit')}
          >
            <Pencil className={iconSize} aria-hidden="true" />
          </IconButton>
          {supplier.isActive && (
            <IconButton
              size={size}
              aria-label={t('suppliers.archiveAria', { name: supplier.name })}
              title={t('suppliers.archiveSupplierTooltip')}
              onClick={() => setDialog('archive')}
            >
              <Archive className={iconSize} aria-hidden="true" />
            </IconButton>
          )}
        </>
      )}

      {dialog === 'edit' && (
        <SupplierFormDialog businessId={businessId} supplier={supplier} onClose={() => setDialog('none')} />
      )}

      {dialog === 'archive' && (
        <ArchiveConfirmModal
          businessId={businessId}
          supplier={supplier}
          purchaseCount={purchaseCount}
          open
          onClose={() => setDialog('none')}
        />
      )}
    </div>
  );
}

export function SupplierManageButtons({
  businessId,
  supplier,
  purchaseCount,
}: {
  businessId: string;
  supplier: SupplierActionData;
  purchaseCount: number;
}) {
  const [dialog, setDialog] = useState<'none' | 'edit' | 'archive'>('none');
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog('edit')}
        className={buttonClasses('outline', 'sm')}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        {t('common.edit')}
      </button>
      {supplier.isActive && (
        <button
          type="button"
          onClick={() => setDialog('archive')}
          className={buttonClasses('outline', 'sm', 'text-danger hover:bg-danger-soft hover:text-danger')}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          {t('suppliers.archive')}
        </button>
      )}

      {dialog === 'edit' && (
        <SupplierFormDialog businessId={businessId} supplier={supplier} onClose={() => setDialog('none')} />
      )}

      {dialog === 'archive' && (
        <ArchiveConfirmModal
          businessId={businessId}
          supplier={supplier}
          purchaseCount={purchaseCount}
          open
          onClose={() => setDialog('none')}
        />
      )}
    </>
  );
}
