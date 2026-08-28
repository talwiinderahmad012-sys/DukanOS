'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/language-context';

export default function CustomersAnalyticsLoading() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-busy="true" aria-label={t('analytics.customers.loadingAria')}>
      <Skeleton className="h-9 w-40" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="space-y-3 rounded-card border border-border bg-surface p-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>
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

      <div className="space-y-4 rounded-card border border-border bg-surface">
        <div className="space-y-2 border-b border-border px-5 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="space-y-2 border-b border-border px-5 py-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
