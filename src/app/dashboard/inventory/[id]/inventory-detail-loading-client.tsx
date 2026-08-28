'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/language-context';

export function InventoryDetailLoadingClient() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label={t('inventory.loadingStockDetails')}>
      <Skeleton className="h-4 w-48" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="space-y-4 border-b border-border px-5 py-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="space-y-4 p-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="overflow-hidden rounded-card border border-border bg-surface lg:col-span-2">
          <div className="space-y-2 border-b border-border px-5 py-4">
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
