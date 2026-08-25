import type { ComponentProps, ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from './cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { container: string; icon: string; Icon: typeof Info }> = {
  info: { container: 'border-blue-200 bg-info-soft text-blue-900', icon: 'text-info', Icon: Info },
  success: {
    container: 'border-emerald-200 bg-success-soft text-emerald-900',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'border-amber-200 bg-warning-soft text-amber-900',
    icon: 'text-warning',
    Icon: AlertTriangle,
  },
  danger: {
    container: 'border-red-200 bg-danger-soft text-red-900',
    icon: 'text-danger',
    Icon: AlertCircle,
  },
};

export interface AlertProps extends Omit<ComponentProps<'div'>, 'title'> {
  tone?: AlertTone;
  title?: ReactNode;
}

export function Alert({ tone = 'info', title, className, children, ...props }: AlertProps) {
  const { container, icon, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-card border p-4 text-sm', container, className)}
      {...props}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
