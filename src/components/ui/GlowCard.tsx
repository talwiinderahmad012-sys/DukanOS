'use client';

import React, { useId, useRef } from 'react';
import { cn } from './cn';

export type GlowHue = 'lime' | 'emerald' | 'amber' | 'teal' | 'violet' | 'rose' | 'sky' | 'slate' | 'blue';

export interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hue?: GlowHue;
  index?: number;
  interactive?: boolean;
  padded?: boolean;
  children?: React.ReactNode;
  as?: React.ElementType;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  variant?: 'card' | 'panel' | 'stat';
  contentClassName?: string;
}

function splitClasses(className?: string): { wrapperClasses: string; contentClasses: string } {
  if (!className) return { wrapperClasses: '', contentClasses: '' };

  const tokens = className.split(/\s+/).filter(Boolean);
  const contentTokens: string[] = [];
  const wrapperTokens: string[] = [];

  for (const token of tokens) {
    const isContentClass = /^(?:[a-z0-9]+:)*(?:p[xytbse]?-|p-\d|flex|grid|gap-|space-[xy]-|items-|justify-|content-|place-|self-|divide-)/.test(token);
    if (isContentClass) {
      contentTokens.push(token);
    } else {
      wrapperTokens.push(token);
    }
  }

  return {
    wrapperClasses: wrapperTokens.join(' '),
    contentClasses: contentTokens.join(' '),
  };
}

const HUE_PALETTES: Record<
  GlowHue,
  {
    lightGradient: string;
    darkGradient: string;
    glowColor: string;
    glareColor: string;
  }
> = {
  lime: {
    lightGradient: 'linear-gradient(135deg, rgba(217, 249, 157, 0.52) 0%, rgba(134, 239, 172, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(63, 98, 18, 0.45) 0%, rgba(20, 83, 45, 0.45) 100%)',
    glowColor: 'rgba(175, 243, 62, 0.45)',
    glareColor: 'rgba(217, 249, 157, 0.52)',
  },
  emerald: {
    lightGradient: 'linear-gradient(135deg, rgba(167, 243, 208, 0.52) 0%, rgba(153, 246, 228, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(6, 95, 70, 0.45) 0%, rgba(17, 94, 89, 0.45) 100%)',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    glareColor: 'rgba(167, 243, 208, 0.52)',
  },
  amber: {
    lightGradient: 'linear-gradient(135deg, rgba(254, 215, 170, 0.55) 0%, rgba(253, 230, 138, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(146, 64, 14, 0.45) 0%, rgba(161, 98, 7, 0.45) 100%)',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    glareColor: 'rgba(254, 215, 170, 0.52)',
  },
  teal: {
    lightGradient: 'linear-gradient(135deg, rgba(165, 243, 252, 0.52) 0%, rgba(191, 219, 254, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(17, 94, 89, 0.45) 0%, rgba(30, 58, 138, 0.45) 100%)',
    glowColor: 'rgba(20, 184, 166, 0.45)',
    glareColor: 'rgba(165, 243, 252, 0.52)',
  },
  violet: {
    lightGradient: 'linear-gradient(135deg, rgba(221, 214, 254, 0.52) 0%, rgba(251, 207, 232, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(91, 33, 182, 0.45) 0%, rgba(131, 24, 67, 0.45) 100%)',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    glareColor: 'rgba(221, 214, 254, 0.52)',
  },
  rose: {
    lightGradient: 'linear-gradient(135deg, rgba(254, 205, 211, 0.55) 0%, rgba(254, 215, 170, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(159, 18, 57, 0.45) 0%, rgba(154, 52, 18, 0.45) 100%)',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    glareColor: 'rgba(254, 205, 211, 0.52)',
  },
  sky: {
    lightGradient: 'linear-gradient(135deg, rgba(186, 230, 253, 0.55) 0%, rgba(199, 210, 254, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(7, 89, 133, 0.45) 0%, rgba(49, 46, 129, 0.45) 100%)',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    glareColor: 'rgba(186, 230, 253, 0.52)',
  },
  slate: {
    lightGradient: 'linear-gradient(135deg, rgba(241, 245, 249, 0.55) 0%, rgba(226, 232, 240, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.45) 100%)',
    glowColor: 'rgba(148, 163, 184, 0.45)',
    glareColor: 'rgba(241, 245, 249, 0.52)',
  },
  blue: {
    lightGradient: 'linear-gradient(135deg, rgba(186, 230, 253, 0.55) 0%, rgba(199, 210, 254, 0.44) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(7, 89, 133, 0.45) 0%, rgba(49, 46, 129, 0.45) 100%)',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    glareColor: 'rgba(186, 230, 253, 0.52)',
  },
};

const HUE_SEQUENCE: GlowHue[] = ['lime', 'emerald', 'amber', 'teal', 'violet', 'rose', 'sky'];

export function GlowCard({
  hue,
  index,
  interactive = true,
  padded = false,
  variant = 'card',
  children,
  className,
  contentClassName,
  style,
  as: Component = 'div',
  ...props
}: GlowCardProps) {
  const autoId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  // Deterministic, SSR-safe hash from React's stable useId
  let idHash = 0;
  for (let i = 0; i < autoId.length; i++) {
    idHash = ((idHash << 5) - idHash + autoId.charCodeAt(i)) | 0;
  }
  const resolvedIndex = typeof index === 'number' && index >= 0 ? index : Math.abs(idHash);
  const activeHue: GlowHue = hue ?? HUE_SEQUENCE[resolvedIndex % HUE_SEQUENCE.length];

  const isPanel = variant === 'panel';
  const hoverLiftClass = isPanel ? 'motion-safe:hover:-translate-y-0.5' : 'motion-safe:hover:-translate-y-1';

  return (
    <Component
      ref={cardRef}
      className={cn(
        'surface-glass glow-panel relative rounded-2xl border border-white/60 transition-all duration-300 dark:border-white/10',
        interactive && hoverLiftClass,
        `glow-${activeHue}`,
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


