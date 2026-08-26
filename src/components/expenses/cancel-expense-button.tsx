'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { cancelExpenseAction } from '@/app/actions/expenses.actions';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';

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
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(message || 'An unexpected error occurred during cancellation.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Cancel expense: ${category}, Rs. ${amount.toLocaleString()}`}
        className={buttonClasses(
          'outline',
          size,
          cn('text-danger border-danger/30 hover:bg-danger-soft hover:text-danger', className),
        )}
      >
        <Ban className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        {label ?? 'Cancel'}
      </button>

      <Modal
        open={isOpen}
        onClose={close}
        title="Cancel Expense"
        description={
          <>
            Cancel the <span className="font-semibold text-gray-900">{category}</span> expense of{' '}
            <span className="font-semibold text-gray-900">Rs. {amount.toLocaleString()}</span>?
          </>
        }
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <Alert tone="warning" title="Cancellation effects">
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              <li>The entry is marked as reversed and excluded from expense totals.</li>
              <li>Reports and analytics are updated to ignore this expense.</li>
              <li>This action is recorded in the audit log.</li>
            </ul>
          </Alert>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" type="button" disabled={loading} onClick={close}>
              Close
            </Button>
            <Button variant="destructive" type="submit" loading={loading}>
              {loading ? 'Cancelling…' : 'Confirm Cancellation'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
