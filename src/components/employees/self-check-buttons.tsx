'use client';

import { useState, useTransition } from 'react';
import { checkInAction, checkOutAction } from '@/app/actions/employee.actions';
import { LogIn, LogOut } from 'lucide-react';

type Props = {
  businessId: string;
  checkedIn: boolean;
  checkedOut: boolean;
};

export function SelfCheckButtons({ businessId, checkedIn, checkedOut }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ success: boolean; message?: string }>) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        setMessage('Done! Refreshing…');
        window.location.reload();
      } else {
        setError(result.message || 'Something went wrong.');
      }
    });
  };

  const btnBase =
    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || checkedIn}
          onClick={() => run(() => checkInAction(businessId, {}))}
          className={`${btnBase} ${
            checkedIn
              ? 'bg-green-100 text-green-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <LogIn className="w-4 h-4" />
          {checkedIn ? 'Checked In' : 'Check In'}
        </button>

        <button
          type="button"
          disabled={isPending || !checkedIn || checkedOut}
          onClick={() => run(() => checkOutAction(businessId, {}))}
          className={`${btnBase} ${
            checkedOut
              ? 'bg-gray-100 text-gray-500'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          <LogOut className="w-4 h-4" />
          {checkedOut ? 'Checked Out' : 'Check Out'}
        </button>
      </div>

      {message && <p className="text-xs text-green-600">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
