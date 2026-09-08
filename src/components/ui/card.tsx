'use client';

import React from 'react';
import type { ComponentProps } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from './cn';
import { useCanHover } from './motion';

export const cardClasses = {
  base: 'rounded-card border border-border bg-surface shadow-card',
  hover: 'transition-all duration-200 hover:border-border-strong hover:shadow-elevated hover:-translate-y-1 cursor-pointer',
};

export interface CardProps extends ComponentProps<'div'> {
  padded?: boolean;
  interactive?: boolean;
}

export function Card({ padded = false, interactive = false, className, children, ...props }: CardProps) {
  const shouldReduceMotion = useReducedMotion();
  const canHover = useCanHover();

  if (interactive && !shouldReduceMotion) {
    return (
      <motion.div
        whileHover={canHover ? { y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' } : undefined}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          cardClasses.base,
          'cursor-pointer transition-colors',
          padded && 'p-5',
          className
        )}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        cardClasses.base,
        interactive && cardClasses.hover,
        padded && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
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
  return <h3 className={cn('text-base font-bold text-gray-900 dark:text-slate-100', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}
