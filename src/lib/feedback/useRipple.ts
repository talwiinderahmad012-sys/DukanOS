'use client';

/**
 * useRipple — Ripple effect hook for buttons and cards.
 *
 * Usage:
 *   const { rippleRef, createRipple } = useRipple();
 *   <button ref={rippleRef} onClick={createRipple} className="ripple-container">
 *
 * The element must have className="ripple-container" (adds position:relative, overflow:hidden).
 * The ripple wave is inserted as a child div with className="ripple-wave".
 */

import { useRef, useCallback } from 'react';

export function useRipple() {
  const ref = useRef<HTMLElement>(null);

  const createRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.className = 'ripple-wave';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, []);

  return { rippleRef: ref, createRipple };
}
