import { Skeleton } from '@/components/ui/skeleton';

export default function POSLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4" aria-busy="true" aria-label="Loading POS terminal">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="space-y-3 rounded-card border border-border bg-surface p-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-card" />
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-card border border-border bg-surface p-4 lg:col-span-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
