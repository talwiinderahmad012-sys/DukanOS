'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { cancelSaleAction } from '@/app/actions/sale.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';

export function CancelSaleButton({
  businessId,
  saleId,
  invoiceNumber,
  isCancelled,
}: {
  businessId: string;
  saleId: string;
  invoiceNumber?: string | null;
  isCancelled: boolean;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isCancelled) {
    return (
      <Badge tone="neutral" className="print:hidden">
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        Cancelled Sale
      </Badge>
    );
  }

  const close = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a reason for cancelling this sale (minimum 3 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelSaleAction(businessId, saleId, reason.trim());

      if (!res.success) {
        setError(res.message || 'Failed to cancel sale.');
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An unexpected error occurred during cancellation.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses('outline', 'md', 'text-danger border-danger/30 hover:bg-danger-soft hover:text-danger print:hidden')}
      >
        <Ban className="h-4 w-4" aria-hidden="true" />
        Cancel Sale
      </button>

      <Modal
        open={isOpen}
        onClose={close}
        title="Cancel Sale Invoice"
        description={
          <>
            Are you sure you want to cancel invoice{' '}
            <span className="font-mono font-semibold text-gray-900">
              {invoiceNumber || `#${saleId.slice(0, 8)}`}
            </span>
            ?
          </>
        }
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <Alert tone="warning" title="Reversal effects">
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>Sold items will be automatically returned to your stock.</li>
              <li>Any unpaid Udhaar added to the customer will be reversed.</li>
              <li>Previously collected cash is not automatically refunded.</li>
            </ul>
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="space-y-1">
            <label htmlFor={reasonId} className="block text-sm font-medium text-gray-700">
              Reason for Cancellation
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Textarea
              id={reasonId}
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer returned items, billing error"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" type="button" disabled={loading} onClick={close}>
              Close
            </Button>
            <Button variant="destructive" type="submit" loading={loading}>
              {loading ? 'Restoring Stock…' : 'Confirm Cancellation'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
