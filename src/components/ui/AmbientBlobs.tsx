'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * AmbientBlobs — three drifting radial-gradient blobs fixed behind page content.
 *
 * Must sit at z-0 inside a relative/fixed container. Glass surfaces placed
 * on top will become noticeably frosted. The blobs are pointer-events-none and
 * aria-hidden so they never interfere with interaction or screen readers.
 *
 * Reduced-motion: CSS `animation: none` is applied via the global .blob-* rule,
 * so blobs stay visible (still colourful) but frozen.
 */
export function AmbientBlobs() {
  const shouldReduceMotion = useReducedMotion();

  // Blobs always render — they provide the colour the glass blurs against.
  // Only the CSS animation is disabled for reduced-motion users.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Primary brand blob — top-left quadrant */}
      <div
        className={`blob-1 absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full opacity-[0.18] dark:opacity-[0.12]`}
        style={{
          background:
            'radial-gradient(circle at center, #aff33e 0%, #4ade80 50%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
      />

      {/* Accent blob — right side */}
      <div
        className={`blob-2 absolute top-1/3 -right-48 h-[500px] w-[500px] rounded-full opacity-[0.15] dark:opacity-[0.10]`}
        style={{
          background:
            'radial-gradient(circle at center, #34d399 0%, #3b82f6 55%, transparent 70%)',
          filter: 'blur(90px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
      />

      {/* Warm accent blob — bottom-centre */}
      <div
        className={`blob-3 absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full opacity-[0.12] dark:opacity-[0.08]`}
        style={{
          background:
            'radial-gradient(circle at center, #f59e0b 0%, #aff33e 60%, transparent 70%)',
          filter: 'blur(70px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
      />
    </div>
  );
}
