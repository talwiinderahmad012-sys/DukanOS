'use client';

/**
 * TiltCard — Premium 3D-tilt glass stat card with:
 *  - 3D rotateX/rotateY following mouse (max 6deg, spring return)
 *  - Moving glare highlight spot tracking the cursor
 *  - Animated gradient border glow on hover
 *  - Ripple on click
 *  - AnimatedNumber count-up for the value
 *  - Custom colored glow shadow per accent colour
 *  - Haptic tap feedback on mobile
 */

import React, { useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { hapticLight } from '@/lib/feedback/haptics';
import { soundCardHover, soundNavClick } from '@/lib/feedback/sound-engine';

interface TiltCardProps {
  label: string;
  numericValue?: number;
  value?: string;
  formatter?: (v: number) => string;
  sub?: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon badge bg + text, e.g. "bg-primary-soft text-primary" */
  accent: string;
  /** CSS color for the glow shadow, e.g. "rgba(175,243,62,0.35)" */
  glowColor?: string;
  valueClass?: string;
  /** data-sound attribute forwarded to the card */
  'data-sound'?: string;
}

export function TiltCard({
  label,
  numericValue,
  value,
  formatter,
  sub,
  icon: Icon,
  accent,
  glowColor = 'rgba(0,0,0,0.12)',
  valueClass,
  'data-sound': dataSound,
}: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  // ── 3D Tilt ─────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const el = cardRef.current;
    const glareEl = glareRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;  // 0-1
    const y = (e.clientY - rect.top) / rect.height;  // 0-1

    const rotX = (y - 0.5) * -12;  // max 6deg
    const rotY = (x - 0.5) * 12;

    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    el.style.transition = 'transform 0.05s ease-out';

    if (glareEl) {
      glareEl.style.setProperty('--glare-x', `${x * 100}%`);
      glareEl.style.setProperty('--glare-y', `${y * 100}%`);
      glareEl.style.opacity = '1';
    }
  }, [shouldReduceMotion]);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    const glareEl = glareRef.current;
    if (el) {
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
      el.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
    }
    if (glareEl) glareEl.style.opacity = '0';
  }, []);

  const handleMouseEnter = useCallback(() => {
    soundCardHover();
  }, []);

  // ── Ripple ──────────────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || shouldReduceMotion) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.className = 'ripple-wave';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });

    hapticLight();
    soundNavClick();
  }, [shouldReduceMotion]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'animated-border glass-card ripple-container relative rounded-2xl p-5 cursor-default select-none',
        'flex flex-col gap-3'
      )}
      style={{ '--card-glow': glowColor } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      data-sound={dataSound}
    >
      {/* Animated gradient border fires via CSS ::before on hover */}

      {/* Glare spot */}
      <div ref={glareRef} className="tilt-glare" />

      {/* Icon + label */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
          {label}
        </p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform hover:scale-110',
            accent
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {/* Value */}
      <div>
        <div className={cn('text-2xl font-bold leading-tight text-gray-900 dark:text-slate-100', valueClass)}>
          {numericValue !== undefined ? (
            <AnimatedNumber value={numericValue} formatter={formatter} duration={1.2} />
          ) : (
            value
          )}
        </div>
        {sub && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
