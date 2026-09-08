'use client';

import React from 'react';
import type { ComponentProps } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';
import { useCanHover } from './motion';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-input font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 active:shadow-none transition-shadow',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  outline: 'border border-border-strong bg-white text-gray-800 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  destructive: 'bg-danger text-white hover:bg-danger-hover hover:shadow-md hover:shadow-danger/20',
  success: 'bg-success text-white hover:bg-success-hover hover:shadow-md hover:shadow-success/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends Omit<ComponentProps<typeof motion.button>, 'size' | 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  whileHover,
  whileTap,
  ...props
}: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const canHover = useCanHover();
  const isDisabled = Boolean(disabled || loading);

  // Apply micro-interactions if enabled and not disabled/loading and on fine pointers (not touch)
  const hoverAnimation = shouldReduceMotion || isDisabled || !canHover
    ? undefined
    : (whileHover ?? { scale: 1.02 });

  const tapAnimation = shouldReduceMotion || isDisabled
    ? undefined
    : (whileTap ?? { scale: 0.97 });

  return (
    <motion.button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      {...props}
    >
      {loading && <Loader2 className={cn('animate-spin', ICON_SIZES[size])} aria-hidden="true" />}
      {children}
    </motion.button>
  );
}

const ICON_BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

export interface IconButtonProps extends Omit<ComponentProps<typeof motion.button>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  'aria-label': string;
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  disabled,
  whileHover,
  whileTap,
  ...props
}: IconButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const canHover = useCanHover();

  const hoverAnimation = shouldReduceMotion || disabled || !canHover
    ? undefined
    : (whileHover ?? { scale: 1.05 });

  const tapAnimation = shouldReduceMotion || disabled
    ? undefined
    : (whileTap ?? { scale: 0.95 });

  return (
    <motion.button
      type={type}
      className={cn(BASE, VARIANTS[variant], ICON_BUTTON_SIZES[size], 'p-0', className)}
      disabled={disabled}
      whileHover={hoverAnimation}
      whileTap={tapAnimation}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      {...props}
    />
  );
}
