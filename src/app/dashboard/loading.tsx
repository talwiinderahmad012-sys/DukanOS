'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/language-context';

export default function DashboardLoading() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label={t('overview.loadingAria')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 bg-surface p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-5 lg:col-span-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3 w-56 max-w-full" />
          <Skeleton className="mt-6 h-48 w-full" />
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mx-auto mt-6 h-28 w-28 rounded-full" />
          <Skeleton className="mt-6 h-12 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-card border border-border bg-surface p-5 lg:col-span-2">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="space-y-3 rounded-card border border-border bg-surface p-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
