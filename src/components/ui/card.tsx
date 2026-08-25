import type { ComponentProps } from 'react';
import { cn } from './cn';

export const cardClasses = {
  base: 'rounded-card border border-border bg-surface shadow-card',
  hover: 'transition-shadow hover:border-border-strong hover:shadow-elevated',
};

export interface CardProps extends ComponentProps<'div'> {
  padded?: boolean;
  interactive?: boolean;
}

export function Card({ padded = false, interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(cardClasses.base, interactive && cardClasses.hover, padded && 'p-5', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-border px-5 py-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-bold text-gray-900', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}
