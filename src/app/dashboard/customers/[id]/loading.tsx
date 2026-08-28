'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/language-context';

export default function CustomerDetailLoading() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label={t('customers.loadingCustomer')}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-card" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-20 w-40 rounded-card" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 bg-surface p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-36 max-w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-card border border-border bg-surface">
        <div className="space-y-2 border-b border-border px-5 py-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-28" />
        </div>
        <Skeleton className="mt-5 h-40 w-full" />
      </div>
    </div>
  );
}
