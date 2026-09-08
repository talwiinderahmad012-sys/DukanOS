'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  animate,
  type HTMLMotionProps,
  type Transition,
} from 'framer-motion';
import { cn } from './cn';

// Easing presets (Linear / Vercel style)
export const TRANSITION_SMOOTH: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

export const TRANSITION_SPRING: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

export const TRANSITION_BOUNCE: Transition = {
  type: 'spring',
  damping: 15,
  stiffness: 260,
};

// Hook to detect RTL direction safely on client
export function useIsRtl(): boolean {
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    const checkRtl = () => {
      if (typeof document !== 'undefined') {
        setIsRtl(document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ur');
      }
    };
    checkRtl();

    const observer = new MutationObserver(checkRtl);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir', 'lang'] });
    return () => observer.disconnect();
  }, []);

  return isRtl;
}

// Hook to detect whether the user has a fine pointer (mouse/trackpad) vs touch screen
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(hover: hover) and (pointer: fine)');
      setCanHover(media.matches);

      const listener = (e: MediaQueryListEvent) => setCanHover(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  return canHover;
}

export interface MotionWrapperProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * FadeIn: Graceful opacity transition
 */
export function FadeIn({
  delay = 0,
  duration = 0.3,
  className,
  children,
  ...props
}: MotionWrapperProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideUp: Graceful GPU-accelerated vertical slide + fade
 */
export function SlideUp({
  delay = 0,
  duration = 0.3,
  className,
  children,
  ...props
}: MotionWrapperProps & { offset?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const offset = props.offset ?? 12;

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -offset / 2 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScaleIn: Snappy scale + fade transition
 */
export function ScaleIn({
  delay = 0,
  duration = 0.25,
  className,
  children,
  ...props
}: MotionWrapperProps & { initialScale?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const initialScale = props.initialScale ?? 0.96;

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: initialScale }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideHorizontal: Direction-aware slide respecting LTR and RTL layouts
 */
export function SlideHorizontal({
  delay = 0,
  duration = 0.3,
  className,
  children,
  offset = 16,
  ...props
}: MotionWrapperProps & { offset?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const isRtl = useIsRtl();
  const startX = isRtl ? offset : -offset;

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: startX }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -startX }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerChildren: Container that coordinates staggered animations of children
 */
export function StaggerChildren({
  staggerDelay = 0.05,
  delayChildren = 0,
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<'div'>, 'children'> & {
  children?: React.ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Shake: Validation error shake animation for form inputs
 */
export function Shake({
  trigger,
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<'div'>, 'children'> & {
  children?: React.ReactNode;
  trigger?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion || !trigger) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        x: [0, -8, 8, -6, 6, -3, 3, 0],
      }}
      transition={{
        duration: 0.4,
        ease: 'easeInOut',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * SpringCheckmark: Delightful animated SVG checkmark on form submit / completion
 */
export function SpringCheckmark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('text-success', className)}
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('text-success', className)}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
    >
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      />
    </motion.svg>
  );
}

/**
 * AnimatedNumber: Smooth 60fps counter animation for stats and KPI cards
 */
export function AnimatedNumber({
  value,
  duration = 1,
  formatter,
  className,
}: {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const controls = animate(prevValueRef.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latest) {
        setDisplayValue(Math.round(latest));
      },
    });

    prevValueRef.current = value;
    return () => controls.stop();
  }, [value, duration, shouldReduceMotion]);

  const formatted = formatter ? formatter(displayValue) : displayValue.toLocaleString();

  return <span className={className}>{formatted}</span>;
}

/**
 * FloatingIcon: Subtle floating/bouncing animation for empty states and hero icons
 */
export function FloatingIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
