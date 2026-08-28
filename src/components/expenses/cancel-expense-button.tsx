'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { cancelExpenseAction } from '@/app/actions/expenses.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { useTranslation } from '@/lib/i18n/language-context';

export const CATEGORY_LABEL_KEYS: Record<string, string> = {
  RENT: 'expenses.rent',
  Rent: 'expenses.rent',
  'Shop Rent': 'expenses.rent',
  ELECTRICITY: 'expenses.electricity',
  Electricity: 'expenses.electricity',
  'Electricity Bill': 'expenses.electricity',
  TEA: 'expenses.teaRefreshment',
  'Tea & Refreshment': 'expenses.teaRefreshment',
  MAINTENANCE: 'expenses.maintenance',
  Maintenance: 'expenses.maintenance',
  'Repair & Maintenance': 'expenses.maintenance',
  SALARY: 'expenses.salary',
  Salary: 'expenses.salary',
  'Staff Salary': 'expenses.salary',
  MISC: 'expenses.misc',
  MISCELLANEOUS: 'expenses.misc',
  Miscellaneous: 'expenses.misc',
  WATER: 'expenses.water',
  Water: 'expenses.water',
  GAS: 'expenses.gas',
  Gas: 'expenses.gas',
  INTERNET: 'expenses.internet',
  Internet: 'expenses.internet',
  'Internet / Phone': 'expenses.internet',
  TRANSPORT: 'expenses.transport',
  Transport: 'expenses.transport',
  'Transport / Fuel': 'expenses.transport',
  STATIONERY: 'expenses.stationery',
  Stationery: 'expenses.stationery',
  'Stationery & Bags': 'expenses.stationery',
  CLEANING: 'expenses.cleaning',
  Cleaning: 'expenses.cleaning',
  'Cleaning Supplies': 'expenses.cleaning',
  OTHER: 'expenses.otherCategory',
  Other: 'expenses.otherCategory',
};

export function CancelExpenseButton({
  expenseId,
  category,
  amount,
  size = 'md',
  label,
  className,
}: {
  expenseId: string;
  category: string;
  amount: number;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { t, tm, formatCurrency } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryLabelKey = CATEGORY_LABEL_KEYS[category] ?? '';
  const categoryLabel = categoryLabelKey ? t(categoryLabelKey) : category;

  const close = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await cancelExpenseAction(expenseId);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(tm(message) || t('expenses.cancelUnexpected'));
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('expenses.cancelAria', { category: categoryLabel, amount: formatCurrency(amount) })}
        className={buttonClasses(
          'outline',
          size,
          cn('text-danger border-danger/30 hover:bg-danger-soft hover:text-danger', className),
        )}
      >
        <Ban className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        {label ?? t('common.cancel')}
      </button>

      <Modal
        open={isOpen}
        onClose={close}
        title={t('expenses.cancelExpense')}
        description={
          <>
            {t('expenses.cancelConfirmPrefix')}
            <span className="font-semibold text-gray-900">{categoryLabel}</span>
            {t('expenses.cancelConfirmMiddle')}
            <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
            {t('expenses.cancelConfirmSuffix')}
          </>
        }
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <Alert tone="warning" title={t('expenses.effectsTitle')}>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>{t('expenses.effect1')}</li>
              <li>{t('expenses.effect2')}</li>
              <li>{t('expenses.effect3')}</li>
            </ul>
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" type="button" disabled={loading} onClick={close}>
              {t('common.close')}
            </Button>
            <Button variant="destructive" type="submit" loading={loading}>
              {loading ? t('expenses.cancelling') : t('expenses.confirmCancellation')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
