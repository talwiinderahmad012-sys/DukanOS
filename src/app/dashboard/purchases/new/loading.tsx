import { Skeleton } from '@/components/ui/skeleton';

export default function NewPurchaseLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true" aria-label="Loading new purchase form">
      <Skeleton className="h-4 w-48" />

      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface p-5">
        <div className="space-y-4">
          <Skeleton className="h-5 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="space-y-2 border-b border-border px-5 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <div className="space-y-4 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-card border border-border bg-surface p-5">
            <div className="space-y-4">
              <Skeleton className="h-5 w-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
