import type { ComponentProps } from 'react';
import { cn } from './cn';
import { EmptyState, type EmptyStateProps } from './empty-state';

export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse text-left text-sm', className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('border-b border-border bg-gray-50 text-xs uppercase tracking-wider text-gray-500', className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return <th className={cn('whitespace-nowrap px-4 py-3 font-medium', className)} {...props} />;
}

export interface TrProps extends ComponentProps<'tr'> {
  selected?: boolean;
}

export function Tr({ selected = false, className, ...props }: TrProps) {
  return (
    <tr
      className={cn(
        'border-b border-gray-100 transition-colors hover:bg-gray-50/60',
        selected && 'bg-primary-soft/50 hover:bg-primary-soft/60',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 text-sm text-gray-900', className)} {...props} />;
}

export interface TableEmptyProps extends EmptyStateProps {
  colSpan: number;
}

export function TableEmpty({ colSpan, className, ...props }: TableEmptyProps) {
  return (
    <tbody>
      <tr className="border-b border-gray-100">
        <td colSpan={colSpan} className={cn('p-0', className)}>
          <EmptyState compact {...props} />
        </td>
      </tr>
    </tbody>
  );
}
