'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/language-context';

export default function CustomersLoading() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t('customers.loadingCustomers')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 bg-surface p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-36 max-w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="space-y-3 border-b border-border p-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-8 w-56 max-w-full" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="hidden h-9 w-28 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
