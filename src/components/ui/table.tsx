import type { ComponentProps } from 'react';
import { cn } from './cn';
import { EmptyState, type EmptyStateProps } from './empty-state';

export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'surface-glass w-full overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 shadow-lg shadow-black/5',
        className
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse text-start text-sm', className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 border-b border-black/5 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold',
        className
      )}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return <th className={cn('whitespace-nowrap px-4 py-3 font-semibold text-slate-600 dark:text-slate-300', className)} {...props} />;
}

export interface TrProps extends ComponentProps<'tr'> {
  selected?: boolean;
  interactive?: boolean;
}

export function Tr({ selected = false, interactive = true, className, ...props }: TrProps) {
  return (
    <tr
      className={cn(
        'border-b border-black/5 dark:border-white/5 transition-colors duration-150',
        interactive && 'hover:bg-white/40 dark:hover:bg-white/5',
        selected && 'bg-lime-400/15 hover:bg-lime-400/25',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 text-sm text-slate-800 dark:text-slate-200', className)} {...props} />;
}

export interface TableEmptyProps extends EmptyStateProps {
  colSpan: number;
}

export function TableEmpty({ colSpan, className, ...props }: TableEmptyProps) {
  return (
    <tbody>
      <tr className="border-b border-transparent">
        <td colSpan={colSpan} className={cn('p-0', className)}>
          <EmptyState compact {...props} />
        </td>
      </tr>
    </tbody>
  );
}
