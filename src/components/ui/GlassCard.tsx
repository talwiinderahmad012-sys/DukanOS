'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Lift + scale slightly on hover — use only for clickable cards */
  interactive?: boolean;
  /** Override rounded-2xl with a custom radius */
  rounded?: string;
  as?: React.ElementType;
}

/**
 * GlassCard — frosted-glass surface that looks stunning over colourful backgrounds.
 *
 * ⚠️  Rules:
 *   1. Only place over a gradient / blob background — plain surfaces look muddy.
 *   2. Do NOT nest GlassCard inside GlassCard or GlassPanel.
 *   3. Use `interactive` only on truly clickable cards; it adds hover animations.
 */
export function GlassCard({
  children,
  className,
  interactive = false,
  rounded = 'rounded-2xl',
  as: Tag = 'div',
}: GlassCardProps) {
  if (interactive) {
    return (
      <motion.div
        className={cn('glass', rounded, className)}
        whileHover={{ y: -3, scale: 1.012 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <Tag className={cn('glass', rounded, className)}>
      {children}
    </Tag>
  );
}
