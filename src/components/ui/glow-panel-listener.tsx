'use client';

import { useEffect } from 'react';

/**
 * GlowPanelListener — Single shared delegated pointer listener for all .glow-panel elements.
 * Updates CSS variables --mx and --my on the actively hovered .glow-panel container.
 * Zero per-panel event listeners, 120 FPS requestAnimationFrame throttling,
 * and strict prefers-reduced-motion compliance.
 */
export function GlowPanelListener() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let currentPanel: HTMLElement | null = null;
    let rafId: number | null = null;
    let pendingEvent: PointerEvent | null = null;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateCoordinates = () => {
      if (!currentPanel || !pendingEvent) {
        rafId = null;
        return;
      }

      const rect = currentPanel.getBoundingClientRect();
      const x = ((pendingEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((pendingEvent.clientY - rect.top) / rect.height) * 100;

      currentPanel.style.setProperty('--mx', `${x.toFixed(1)}%`);
      currentPanel.style.setProperty('--my', `${y.toFixed(1)}%`);
      rafId = null;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (reducedMotionQuery.matches) return;

      const target = e.target as HTMLElement | null;
      const panel = target?.closest?.('.glow-panel') as HTMLElement | null;

      if (panel !== currentPanel) {
        if (currentPanel) {
          currentPanel.removeAttribute('data-hovered');
        }
        currentPanel = panel;
        if (currentPanel) {
          currentPanel.setAttribute('data-hovered', 'true');
        }
      }

      if (currentPanel) {
        pendingEvent = e;
        if (rafId === null) {
          rafId = requestAnimationFrame(updateCoordinates);
        }
      }
    };

    const handlePointerLeave = () => {
      if (currentPanel) {
        currentPanel.removeAttribute('data-hovered');
        currentPanel = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('scroll', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('scroll', handlePointerLeave);
      if (currentPanel) {
        currentPanel.removeAttribute('data-hovered');
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return null;
}
