'use client';

import React from 'react';
import { SurfaceCard } from './SurfaceCard';
import type { GlowHue } from './GlowCard';



interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  hue?: GlowHue;
  index?: number;
  rounded?: string;
  as?: React.ElementType;
}

export function GlassCard({
  children,
  className,
  interactive: _interactive,
  hue: _hue,
  index: _index,
  rounded: _rounded,
  as,
  ...props
}: GlassCardProps) {
  // STRICT GLOW RULE: GlassCard is a generic wrapper — it must never glow.
  // Stat/KPI cards use GlowCard explicitly; everything else uses SurfaceCard.
  return (
    <SurfaceCard as={as} className={className} {...props}>
      {children}
    </SurfaceCard>
  );
}

