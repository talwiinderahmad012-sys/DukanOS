'use client';

/**
 * IosBanner — Apple iOS-style notification banners with spring physics.
 *
 * Features:
 *  - Spring entrance from top with scale pop.
 *  - Drag-to-dismiss (swipe up to dismiss early).
 *  - Multiple banners stack — the newest is always on top.
 *  - Reduced-motion: falls back to opacity fade (no spring / scale).
 *  - Plays a soft `soundNotification()` on arrival (respects user toggle).
 *  - Fires `hapticLight()` on arrival.
 *
 * Usage:
 *   import { showBanner } from '@/components/notifications/IosBanner';
 *   showBanner({ title: 'Saved', body: 'Your changes were saved.', type: 'success' });
 *
 *   // or use the React component tree via <IosBannerProvider /> in your layout.
 */

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, type Variants } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { soundNotification, soundSuccess, soundError, soundWarning } from '@/lib/feedback/sounds';
import { hapticLight, hapticSuccess, hapticError, hapticWarning } from '@/lib/feedback/haptics';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type BannerType = 'success' | 'error' | 'warning' | 'info';

export interface BannerOptions {
  title: string;
  body?: string;
  type?: BannerType;
  /** Auto-dismiss after ms. Default 4000. Pass 0 to disable. */
  duration?: number;
  /** Optional action button */
  action?: { label: string; onClick: () => void };
}

interface BannerItem extends BannerOptions {
  id: string;
}

/* ── Context / singleton bridge ─────────────────────────────────────────────── */

type ShowFn = (options: BannerOptions) => void;

const BannerContext = createContext<{ show: ShowFn } | null>(null);

/** Use inside a component tree — preferred. */
export function useBanner(): { show: ShowFn } {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error('useBanner must be used inside <IosBannerProvider>');
  return ctx;
}

/** Singleton ref for imperative `showBanner()` calls outside React trees. */
let _imperativeShow: ShowFn | null = null;

/** Call from anywhere (server actions, utility functions, etc.) */
export function showBanner(options: BannerOptions): void {
  if (_imperativeShow) {
    _imperativeShow(options);
  } else {
    // Queue until provider mounts
    setTimeout(() => showBanner(options), 200);
  }
}

/* ── Individual banner ─────────────────────────────────────────────────────── */

const ICON_MAP: Record<BannerType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR_MAP: Record<BannerType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

const BG_MAP: Record<BannerType, string> = {
  success: 'bg-emerald-500/10',
  error: 'bg-red-500/10',
  warning: 'bg-amber-500/10',
  info: 'bg-blue-500/10',
};

interface SingleBannerProps {
  banner: BannerItem;
  onDismiss: (id: string) => void;
  index: number;
}

function SingleBanner({ banner, onDismiss, index }: SingleBannerProps) {
  const shouldReduceMotion = useReducedMotion();
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-120, 0], [0, 1]);
  const scale = useTransform(y, [-120, 0], [0.88, 1]);

  const type = banner.type ?? 'info';
  const Icon = ICON_MAP[type];
  const duration = banner.duration ?? 4000;

  useEffect(() => {
    if (duration === 0) return;
    const t = setTimeout(() => onDismiss(banner.id), duration);
    return () => clearTimeout(t);
  }, [banner.id, duration, onDismiss]);

  const springVariants: Variants = {
    initial: { opacity: 0, y: -120, scale: 0.88 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 380,
        damping: 28,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      y: -100,
      scale: 0.9,
      transition: { duration: 0.22, ease: 'easeIn' as const },
    },
  };

  const fadeVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
  };

  const variants: Variants = shouldReduceMotion ? fadeVariants : springVariants;

  return (
    <motion.div
      key={banner.id}
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={shouldReduceMotion ? {} : { y, opacity, scale }}
      drag={shouldReduceMotion ? false : 'y'}
      dragConstraints={{ top: -200, bottom: 20 }}
      dragElastic={{ top: 0.5, bottom: 0.1 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -60 || info.velocity.y < -400) {
          onDismiss(banner.id);
        }
      }}
      className={cn(
        'glass-strong w-full max-w-sm rounded-2xl px-4 py-3 shadow-xl',
        'cursor-grab active:cursor-grabbing select-none',
        index > 0 && 'mt-2'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', BG_MAP[type])}>
          <Icon className={cn('h-4 w-4', COLOR_MAP[type])} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
            {banner.title}
          </p>
          {banner.body && (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 leading-snug">
              {banner.body}
            </p>
          )}
          {banner.action && (
            <button
              type="button"
              onClick={() => { banner.action?.onClick(); onDismiss(banner.id); }}
              className={cn(
                'mt-1.5 text-xs font-semibold',
                COLOR_MAP[type],
                'hover:underline focus-visible:outline-none'
              )}
            >
              {banner.action.label}
            </button>
          )}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={() => onDismiss(banner.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200/60 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors focus-visible:outline-none"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          className={cn('mt-2.5 h-0.5 rounded-full', BG_MAP[type])}
          initial={{ scaleX: 1, originX: 0 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}

/* ── Sound + haptic helper ─────────────────────────────────────────────────── */

function fireFeedback(type: BannerType) {
  switch (type) {
    case 'success':
      soundSuccess();
      hapticSuccess();
      break;
    case 'error':
      soundError();
      hapticError();
      break;
    case 'warning':
      soundWarning();
      hapticWarning();
      break;
    default:
      soundNotification();
      hapticLight();
  }
}

/* ── Provider ───────────────────────────────────────────────────────────────── */

let _idCounter = 0;

export function IosBannerProvider({ children }: { children: React.ReactNode }) {
  const [banners, setBanners] = useState<BannerItem[]>([]);

  const show = useCallback((options: BannerOptions) => {
    const id = `banner-${++_idCounter}`;
    setBanners((prev) => [{ ...options, id }, ...prev].slice(0, 4)); // max 4 stacked
    fireFeedback(options.type ?? 'info');
  }, []);

  const dismiss = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Wire up imperative singleton
  useEffect(() => {
    _imperativeShow = show;
    return () => { _imperativeShow = null; };
  }, [show]);

  return (
    <BannerContext.Provider value={{ show }}>
      {children}

      {/* Banner stack portal — top-right, above everything */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed top-4 end-4 z-[9999] flex flex-col items-end gap-2"
      >
        <AnimatePresence mode="popLayout">
          {banners.map((banner, i) => (
            <div key={banner.id} className="pointer-events-auto w-full max-w-sm">
              <SingleBanner banner={banner} onDismiss={dismiss} index={i} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </BannerContext.Provider>
  );
}
