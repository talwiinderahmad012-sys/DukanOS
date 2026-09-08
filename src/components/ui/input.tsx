'use client';

import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { cn } from './cn';
import { SpringCheckmark } from './motion';

const INPUT_BASE =
  'w-full rounded-input border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:shadow-xs disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500';

const INVALID = 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/50';

export function inputClasses(invalid?: boolean, className?: string): string {
  return cn(INPUT_BASE, invalid && INVALID, className);
}

export interface InputProps extends ComponentProps<'input'> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...props }: InputProps) {
  const shouldReduceMotion = useReducedMotion();

  if (invalid && !shouldReduceMotion) {
    return (
      <motion.input
        animate={{ x: [-10, 10, -10, 10, 0] }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={inputClasses(invalid, className)}
        aria-invalid={invalid || undefined}
        {...(props as any)}
      />
    );
  }

  return <input className={inputClasses(invalid, className)} aria-invalid={invalid || undefined} {...props} />;
}

export interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, rows = 4, ...props }: TextareaProps) {
  const shouldReduceMotion = useReducedMotion();

  if (invalid && !shouldReduceMotion) {
    return (
      <motion.textarea
        rows={rows}
        animate={{ x: [-10, 10, -10, 10, 0] }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={cn(inputClasses(invalid, className), 'min-h-[80px]')}
        aria-invalid={invalid || undefined}
        {...(props as any)}
      />
    );
  }

  return (
    <textarea
      rows={rows}
      className={cn(inputClasses(invalid, className), 'min-h-[80px]')}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export interface SelectProps extends ComponentProps<'select'> {
  invalid?: boolean;
}

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      className={inputClasses(invalid, cn('pe-8', className))}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      className={cn('h-4 w-4 shrink-0 rounded border-gray-300 dark:border-slate-600 accent-primary cursor-pointer transition-transform active:scale-95', className)}
      {...props}
    />
  );
}

export function Radio({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type="radio"
      className={cn('h-4 w-4 shrink-0 border-gray-300 dark:border-slate-600 accent-primary cursor-pointer transition-transform active:scale-95', className)}
      {...props}
    />
  );
}

export interface FieldProps extends ComponentProps<'div'> {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Field({ label, htmlFor, required, hint, error, className, children, ...props }: FieldProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('space-y-1', className)} {...props}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
        {required && (
          <span className="ms-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        shouldReduceMotion ? (
          <p className="text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        ) : (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium text-danger"
            role="alert"
          >
            {error}
          </motion.p>
        )
      )}
    </div>
  );
}

export interface SearchInputProps extends Omit<InputProps, 'className'> {
  className?: string;
  iconClassName?: string;
}

export function SearchInput({ className, iconClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn('pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500', iconClassName)}
        aria-hidden="true"
      />
      <Input {...props} className="ps-9" />
    </div>
  );
}

export { SpringCheckmark };
