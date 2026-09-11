'use client';

import React from 'react';
import { cn } from './cn';

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  as?: React.ElementType;
  padded?: boolean;
  [key: string]: any;
}


/**
 * SurfaceCard — premium NON-glowing surface.
 *
 * STRICT APP RULE: only small stat/KPI cards may glow (GlowCard).
 * Every other surface (list panels, search+table panels, settings cards,
 * onboarding cards, modals, POS panels, monitoring views, etc.) must use
 * SurfaceCard. No hover gradient, no glare, no tilt — only a subtle
 * shadow deepen on hover.
 */
export function SurfaceCard({
  children,
  className,
  as: Component = 'div',
  padded = false,
  style,
  ...props
}: SurfaceCardProps) {
  return (
    <Component
      className={cn(
        'surface-card relative rounded-2xl border border-white/70 dark:border-white/12',
        'shadow-lg shadow-black/[0.04] dark:shadow-black/20',
        'transition-shadow duration-200 hover:shadow-xl hover:shadow-black/[0.07] dark:hover:shadow-black/30',
        padded && 'p-5',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
}

export default SurfaceCard;
