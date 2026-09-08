'use client';

import React, { useEffect, useState, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

export interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (val: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1,
  prefix = '',
  suffix = '',
  formatter,
  className,
}: AnimatedNumberProps) {
  const shouldReduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(() => (shouldReduceMotion ? value : 0));
  const prevRef = useRef(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setCurrent(value);
      return;
    }

    const start = prevRef.current;
    const controls = animate(start, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latest) {
        setCurrent(Math.round(latest));
      },
    });

    prevRef.current = value;
    return () => controls.stop();
  }, [value, duration, shouldReduceMotion]);

  const display = formatter ? formatter(current) : current.toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
