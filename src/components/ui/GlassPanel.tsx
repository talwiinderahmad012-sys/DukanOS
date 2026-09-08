'use client';

import React from 'react';
import { cn } from '@/components/ui/cn';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  /** Use rounded-3xl for larger containers, rounded-2xl for smaller */
  rounded?: string;
  as?: React.ElementType;
}

/**
 * GlassPanel — strong-blur frosted surface intended for larger UI chrome
 * (sidebars, modals, drawers, notification banners).
 *
 * ⚠️  Rules:
 *   1. Only place over a gradient / blob background.
 *   2. Do NOT nest GlassPanel inside GlassCard or another GlassPanel.
 *   3. Prefer GlassCard for individual content cards; GlassPanel for containers.
 */
export function GlassPanel({
  children,
  className,
  rounded = 'rounded-3xl',
  as: Tag = 'div',
}: GlassPanelProps) {
  return (
    <Tag className={cn('glass-strong', rounded, className)}>
      {children}
    </Tag>
  );
}
