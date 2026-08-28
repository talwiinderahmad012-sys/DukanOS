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
import { useTranslation } from '@/lib/i18n/language-context';

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
  const { t, tm } = useTranslation();
  const reasonId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isCancelled) {
    return (
      <Badge tone="neutral" className="print:hidden">
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        {t('sales.cancelledSaleBadge')}
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
      setError(t('sales.reasonTooShort'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelSaleAction(businessId, saleId, reason.trim());

      if (!res.success) {
        setError(tm(res.message) || t('sales.cancelFallback'));
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(tm(e.message) || t('sales.cancelUnexpected'));
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
        {t('sales.cancelSale')}
      </button>

      <Modal
        open={isOpen}
        onClose={close}
        title={t('sales.cancelModalTitle')}
        description={
          <>
            {t('sales.cancelConfirmPrefix')}{' '}
            <span className="font-mono font-semibold text-gray-900">
              {invoiceNumber || `#${saleId.slice(0, 8)}`}
            </span>
            {t('sales.cancelConfirmSuffix')}
          </>
        }
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <Alert tone="warning" title={t('sales.reversalTitle')}>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>{t('sales.reversalItem1')}</li>
              <li>{t('sales.reversalItem2')}</li>
              <li>{t('sales.reversalItem3')}</li>
            </ul>
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="space-y-1">
            <label htmlFor={reasonId} className="block text-sm font-medium text-gray-700">
              {t('sales.reasonLabel')}
              <span className="ms-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Textarea
              id={reasonId}
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('sales.reasonPlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" type="button" disabled={loading} onClick={close}>
              {t('common.close')}
            </Button>
            <Button variant="destructive" type="submit" loading={loading}>
              {loading ? t('sales.restoringStock') : t('sales.confirmCancellation')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
