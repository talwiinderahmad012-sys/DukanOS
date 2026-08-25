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
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  async function handleArchive() {
    setArchiving(true);
    setArchiveError('');
    try {
      const res = await archiveSupplierAction(businessId, supplier.id);
      if (!res.success) {
        setArchiveError(res.message || 'Failed to archive supplier');
        setArchiving(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setArchiveError('An unexpected error occurred.');
      setArchiving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!archiving) onClose();
      }}
      title="Archive supplier?"
      description="Archived suppliers are hidden from active lists."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={archiving}>
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
          <Alert tone="danger" title="Could not archive supplier">
            {archiveError}
          </Alert>
        )}
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">“{supplier.name}”</span> will be marked as
          archived.{' '}
          {purchaseCount > 0
            ? `Their ${purchaseCount} purchase ${purchaseCount === 1 ? 'record' : 'records'} and payment history remain intact for reporting, but the supplier will no longer appear in active supplier lists.`
            : 'No purchases are recorded for this supplier, so nothing else is affected.'}
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

  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard/suppliers/${supplier.id}`}
        aria-label={`View purchase history for ${supplier.name}`}
        title="View purchase history"
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
            aria-label={`Edit ${supplier.name}`}
            title="Edit supplier"
            onClick={() => setDialog('edit')}
          >
            <Pencil className={iconSize} aria-hidden="true" />
          </IconButton>
          {supplier.isActive && (
            <IconButton
              size={size}
              aria-label={`Archive ${supplier.name}`}
              title="Archive supplier"
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

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog('edit')}
        className={buttonClasses('outline', 'sm')}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edit
      </button>
      {supplier.isActive && (
        <button
          type="button"
          onClick={() => setDialog('archive')}
          className={buttonClasses('outline', 'sm', 'text-danger hover:bg-danger-soft hover:text-danger')}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          Archive
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
