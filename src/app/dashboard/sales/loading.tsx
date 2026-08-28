'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/language-context';

export default function SalesLoading() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" aria-busy="true" aria-label={t('sales.loadingAria')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
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

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="space-y-3 border-b border-border p-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full xl:w-44" />
            ))}
          </div>
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
