'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { cancelPurchaseAction } from '@/app/actions/purchase.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/language-context';

export function CancelPurchaseButton({
  businessId,
  purchaseId,
  invoiceNumber,
  isCancelled,
}: {
  businessId: string;
  purchaseId: string;
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
      <Badge tone="neutral">
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        {t('purchases.cancelledPurchaseBadge')}
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
      setError(t('purchases.reasonRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelPurchaseAction(businessId, purchaseId, reason.trim());

      if (!res.success) {
        setError(tm(res.message) || t('purchases.cancelFallback'));
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const e = err as Error;
      setError(tm(e.message) || t('purchases.cancelUnexpected'));
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClasses('outline', 'md', 'text-danger border-danger/30 hover:bg-danger-soft hover:text-danger')}
      >
        <Ban className="h-4 w-4" aria-hidden="true" />
        {t('purchases.cancelPurchase')}
      </button>

      <Modal
        open={isOpen}
        onClose={close}
        title={t('purchases.cancelModalTitle')}
        description={
          <>
            {t('purchases.cancelConfirmPrefix')}
            <span className="font-mono font-semibold text-gray-900">
              {invoiceNumber || `#${purchaseId.slice(0, 8)}`}
            </span>
            {t('purchases.cancelConfirmSuffix')}
          </>
        }
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <Alert tone="warning" title={t('purchases.impactTitle')}>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>{t('purchases.impactItem1')}</li>
              <li>{t('purchases.impactItem2')}</li>
              <li>{t('purchases.impactItem3')}</li>
            </ul>
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="space-y-1">
            <label htmlFor={reasonId} className="block text-sm font-medium text-gray-700">
              {t('purchases.reasonLabel')}
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
              placeholder={t('purchases.reasonPlaceholder')}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" type="button" disabled={loading} onClick={close}>
              {t('common.close')}
            </Button>
            <Button variant="destructive" type="submit" loading={loading}>
              {loading ? t('purchases.reversingStock') : t('purchases.confirmReversal')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
