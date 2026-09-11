'use client';

import React from 'react';
import type { ComponentProps } from 'react';
import { cn } from './cn';
import { GlowCard, type GlowHue } from './GlowCard';

export const cardClasses = {
  base: 'surface-glass rounded-2xl border border-white/60 dark:border-white/15 shadow-lg shadow-black/5',
  hover: 'transition-all duration-200 hover:border-white/80 dark:hover:border-white/25 hover:shadow-xl hover:-translate-y-1 cursor-pointer',
};

export interface CardProps extends ComponentProps<'div'> {
  padded?: boolean;
  interactive?: boolean;
  hue?: GlowHue;
  index?: number;
  variant?: 'card' | 'panel';
  as?: React.ElementType;
  [key: string]: any;
}

export function Card({
  padded = false,
  interactive = true,
  hue,
  index,
  variant = 'card',
  as,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <GlowCard
      as={as}
      padded={padded}
      interactive={interactive}
      hue={hue}
      index={index}
      variant={variant}
      className={className}
      {...props}
    >
      {children}
    </GlowCard>
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-black/5 dark:border-white/10 px-5 py-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-bold text-slate-900 dark:text-white', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}
