'use client';

import React from 'react';
import type { ComponentProps, ComponentType, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { cn } from './cn';

export interface EmptyStateProps extends ComponentProps<'div'> {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center px-6 text-center',
          compact ? 'py-6' : 'py-12',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'mb-3 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500',
            compact ? 'h-10 w-10' : 'h-14 w-14',
          )}
        >
          <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
      {...(props as any)}
    >
      {/* Floating icon animation */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut',
        }}
        className={cn(
          'mb-3 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-400 shadow-xs',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
      </motion.div>

      {/* Staggered text & action */}
      <motion.h3
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="text-sm font-semibold text-gray-900 dark:text-slate-100"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="mt-1 max-w-sm text-sm text-muted"
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.22, duration: 0.25 }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
