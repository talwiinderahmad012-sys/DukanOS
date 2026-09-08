import type { ComponentProps } from 'react';
import { cn } from './cn';

/**
 * Premium Shimmer Skeleton with 60fps linear-gradient animation
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/**
 * Skeleton Stat card for dashboard KPI overviews
 */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-card border border-border bg-surface p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton Table for data grids
 */
export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('w-full overflow-hidden rounded-card border border-border bg-surface', className)}>
      {/* Table header */}
      <div className="flex border-b border-border bg-gray-50/70 dark:bg-slate-800/50 p-4 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table rows */}
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex p-4 gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-4 flex-1', c === 0 ? 'w-1/3' : 'w-full')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Card for generic container blocks
 */
export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5 space-y-4', className)}>
      {children || (
        <>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </>
      )}
    </div>
  );
}

/**
 * Skeleton Chart preview
 */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex items-end gap-2 h-44 pt-6">
        {Array.from({ length: 8 }).map((_, i) => {
          const heights = ['h-16', 'h-24', 'h-32', 'h-40', 'h-28', 'h-36', 'h-20', 'h-44'];
          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1.5 h-full">
              <Skeleton className={cn('w-full rounded-t-sm', heights[i % heights.length])} />
              <Skeleton className="h-2 w-full max-w-[28px]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
