'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lk-ring focus-visible:ring-offset-2 focus-visible:ring-offset-lk-background';

export type LkButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type LkButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BTN_BASE = cn(
  'inline-flex items-center justify-center gap-2 rounded-lk-md font-semibold tracking-lk transition-colors',
  'disabled:pointer-events-none disabled:opacity-50',
  FOCUS,
);

const BTN_VARIANTS: Record<LkButtonVariant, string> = {
  primary:
    'bg-lk-primary text-lk-primary-foreground hover:bg-lk-primary/85 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]',
  secondary: 'bg-lk-secondary text-lk-secondary-foreground hover:bg-lk-secondary/85',
  outline:
    'border border-lk-input bg-lk-card text-lk-foreground hover:bg-lk-accent hover:text-lk-accent-foreground',
  ghost: 'text-lk-muted-foreground hover:bg-lk-accent hover:text-lk-accent-foreground',
  destructive: 'bg-lk-destructive text-lk-destructive-foreground hover:bg-lk-destructive/85',
};

const BTN_SIZES: Record<LkButtonSize, string> = {
  sm: 'h-8 rounded-lk-sm px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-sm',
  icon: 'h-10 w-10',
};

export interface LkButtonProps extends ComponentProps<'button'> {
  variant?: LkButtonVariant;
  size?: LkButtonSize;
  loading?: boolean;
}

export function LkButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...props
}: LkButtonProps) {
  return (
    <button
      type={type}
      className={cn(BTN_BASE, BTN_VARIANTS[variant], BTN_SIZES[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export type LkBadgeVariant = 'primary' | 'secondary' | 'accent' | 'muted' | 'outline' | 'destructive';

const BADGE_VARIANTS: Record<LkBadgeVariant, string> = {
  primary: 'bg-lk-primary text-lk-primary-foreground',
  secondary: 'bg-lk-secondary text-lk-secondary-foreground',
  accent: 'bg-lk-accent text-lk-accent-foreground',
  muted: 'bg-lk-muted text-lk-muted-foreground',
  outline: 'border border-lk-border text-lk-foreground',
  destructive: 'bg-lk-destructive text-lk-destructive-foreground',
};

export interface LkBadgeProps extends ComponentProps<'span'> {
  variant?: LkBadgeVariant;
}

export function LkBadge({ variant = 'primary', className, ...props }: LkBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lk-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-lk',
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LkCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-lk border border-lk-border bg-lk-card text-lk-card-foreground lk-shadow',
        className,
      )}
      {...props}
    />
  );
}

export function LkCardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-lk-border px-5 py-4', className)} {...props} />
  );
}

export function LkCardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-sm font-bold tracking-lk text-lk-card-foreground', className)} {...props} />;
}

export function LkCardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('mt-0.5 text-xs text-lk-muted-foreground', className)} {...props} />;
}

export function LkCardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function LkLabel({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-semibold uppercase tracking-lk text-lk-muted-foreground', className)}
      {...props}
    />
  );
}

const FIELD = cn(
  'w-full rounded-lk-md border border-lk-input bg-lk-card text-sm text-lk-foreground tracking-lk',
  'placeholder:text-lk-muted-foreground/70',
  FOCUS,
);

export function LkInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(FIELD, 'h-10 px-3', className)} {...props} />;
}

export function LkTextarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(FIELD, 'min-h-20 px-3 py-2', className)} {...props} />;
}

export function LkSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(FIELD, 'h-10 cursor-pointer appearance-none px-3 pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export interface LkSwitchProps extends Omit<ComponentProps<'button'>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function LkSwitch({ checked, onCheckedChange, className, ...props }: LkSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-lk-primary' : 'bg-lk-input',
        FOCUS,
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'block h-5 w-5 rounded-full bg-lk-card shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

const PROGRESS_TONES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-lk-chart-1',
  2: 'bg-lk-chart-2',
  3: 'bg-lk-chart-3',
  4: 'bg-lk-chart-4',
  5: 'bg-lk-chart-5',
};

export function LkProgress({
  value,
  tone = 1,
  className,
}: {
  value: number;
  tone?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-lk-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all', PROGRESS_TONES[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function LkAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full bg-lk-secondary text-xs font-bold text-lk-secondary-foreground',
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function LkSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lk-sm bg-lk-muted', className)} />;
}

export type LkAlertVariant = 'info' | 'accent' | 'destructive';

const ALERT_VARIANTS: Record<LkAlertVariant, { wrap: string; icon: ReactNode }> = {
  info: {
    wrap: 'border-lk-border bg-lk-muted text-lk-foreground',
    icon: <Info className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  accent: {
    wrap: 'border-lk-accent bg-lk-accent text-lk-accent-foreground',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  destructive: {
    wrap: 'border-transparent bg-lk-destructive text-lk-destructive-foreground',
    icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
};

export function LkAlert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: LkAlertVariant;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const { wrap, icon } = ALERT_VARIANTS[variant];
  return (
    <div className={cn('flex gap-3 rounded-lk-md border px-4 py-3', wrap, className)}>
      {icon}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold leading-none tracking-lk">{title}</p>
        {children ? <p className="text-xs opacity-80">{children}</p> : null}
      </div>
    </div>
  );
}

export interface LkTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function LkTabs({ items, className }: { items: LkTabItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const current = items.find((i) => i.id === active) ?? items[0];
  return (
    <div className={cn('space-y-4', className)}>
      <div className="inline-flex rounded-lk-md bg-lk-muted p-1" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === current?.id}
            onClick={() => setActive(item.id)}
            className={cn(
              'rounded-[calc(var(--radius)*0.375-2px)] px-4 py-1.5 text-sm font-semibold tracking-lk transition-colors',
              item.id === current?.id
                ? 'bg-lk-card text-lk-foreground lk-shadow'
                : 'text-lk-muted-foreground hover:text-lk-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
