'use client';

/**
 * TiltCard / StatCard — Premium, zero-lag stat card.
 *
 * Performance characteristics:
 *  - ZERO 3D tilt / perspective matrix calculation on mousemove (completely eliminated).
 *  - ZERO React state updates on hover (hover styling handled via pure CSS :hover).
 *  - Wrapped in React.memo so dashboard parent re-renders never cause stat card re-renders.
 *  - Pure CSS elevation (hover:-translate-y-1) and smooth CSS shadow transition.
 *  - AnimatedNumber value count-up preserved.
 *  - Haptic and click feedback preserved.
 */

import React, { memo, useCallback } from 'react';
import { cn } from '@/components/ui/cn';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { hapticLight } from '@/lib/feedback/haptics';
import { soundNavClick } from '@/lib/feedback/sound-engine';
import type { GlowHue } from './GlowCard';

interface TiltCardProps {
  label: string;
  numericValue?: number;
  value?: string;
  formatter?: (v: number) => string;
  sub?: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon badge bg + text */
  accent: string;
  /** CSS color for the glow shadow */
  glowColor?: string;
  valueClass?: string;
  /** data-sound attribute forwarded to the card */
  'data-sound'?: string;
  hue?: GlowHue;
}

const STAT_HUE_CLASSES: Record<GlowHue, { border: string; glow: string; badge: string }> = {
  lime: {
    border: 'hover:border-lime-500/50',
    glow: 'hover:shadow-lime-500/20',
    badge: 'group-hover:scale-105',
  },
  emerald: {
    border: 'hover:border-emerald-500/50',
    glow: 'hover:shadow-emerald-500/20',
    badge: 'group-hover:scale-105',
  },
  amber: {
    border: 'hover:border-amber-500/50',
    glow: 'hover:shadow-amber-500/20',
    badge: 'group-hover:scale-105',
  },
  teal: {
    border: 'hover:border-teal-500/50',
    glow: 'hover:shadow-teal-500/20',
    badge: 'group-hover:scale-105',
  },
  rose: {
    border: 'hover:border-rose-500/50',
    glow: 'hover:shadow-rose-500/20',
    badge: 'group-hover:scale-105',
  },
  violet: {
    border: 'hover:border-violet-500/50',
    glow: 'hover:shadow-violet-500/20',
    badge: 'group-hover:scale-105',
  },
  sky: {
    border: 'hover:border-sky-500/50',
    glow: 'hover:shadow-sky-500/20',
    badge: 'group-hover:scale-105',
  },
  slate: {
    border: 'hover:border-slate-500/50',
    glow: 'hover:shadow-slate-500/20',
    badge: 'group-hover:scale-105',
  },
  blue: {
    border: 'hover:border-blue-500/50',
    glow: 'hover:shadow-blue-500/20',
    badge: 'group-hover:scale-105',
  },
};

function inferHue(accent: string, hue?: GlowHue): GlowHue {
  if (hue) return hue;
  if (accent.includes('lime')) return 'lime';
  if (accent.includes('emerald')) return 'emerald';
  if (accent.includes('amber')) return 'amber';
  if (accent.includes('rose') || accent.includes('red')) return 'rose';
  if (accent.includes('teal') || accent.includes('cyan')) return 'teal';
  if (accent.includes('violet') || accent.includes('purple')) return 'violet';
  return 'sky';
}

export const TiltCard = memo(function TiltCard({
  label,
  numericValue,
  value,
  formatter,
  sub,
  icon: Icon,
  accent,
  glowColor = 'rgba(0,0,0,0.12)',
  valueClass,
  'data-sound': dataSound = 'nav-click',
  hue,
}: TiltCardProps) {
  const resolvedHue = inferHue(accent, hue);
  const hueStyle = STAT_HUE_CLASSES[resolvedHue] ?? STAT_HUE_CLASSES.lime;

  const handleClick = useCallback(() => {
    hapticLight();
    soundNavClick();
  }, []);

  return (
    <div
      onClick={handleClick}
      data-sound={dataSound}
      className={cn(
        'group surface-glass glow-panel relative rounded-2xl p-5 cursor-default select-none overflow-hidden',
        'flex flex-col gap-3 transition-all duration-200 ease-out',
        'motion-safe:hover:-translate-y-1 hover:shadow-xl',
        `glow-${resolvedHue}`,
        hueStyle.border,
        hueStyle.glow
      )}
      style={{
        '--card-glow': glowColor,
      } as React.CSSProperties}
    >
      {/* Icon + label */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 shadow-2xs',
            hueStyle.badge,
            accent
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {/* Value */}
      <div className="relative z-10">
        <div className={cn('text-2xl font-bold leading-tight text-slate-900 dark:text-white tracking-tight', valueClass)}>
          {numericValue !== undefined ? (
            <AnimatedNumber value={numericValue} formatter={formatter} duration={1.0} />
          ) : (
            value
          )}
        </div>
        {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">{sub}</p>}
      </div>
    </div>
  );
});
