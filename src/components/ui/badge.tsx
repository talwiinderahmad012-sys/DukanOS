import type { ComponentProps } from 'react';
import { cn } from './cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
  primary: 'bg-primary text-white border-primary',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function badgeClasses(tone: BadgeTone = 'neutral', className?: string): string {
  return cn(
    'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    TONES[tone],
    className,
  );
}

export interface BadgeProps extends ComponentProps<'span'> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={badgeClasses(tone, className)} {...props} />;
}
