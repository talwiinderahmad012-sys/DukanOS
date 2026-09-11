'use client';

/**
 * AuroraBackground — ultra-high-performance static gradient backdrop.
 *
 * Performance characteristics:
 *   - Exactly 2 static radial-gradient blobs (top-left & top-right) with natural feathered falloff.
 *   - ZERO CSS filter: blur() filters — radial-gradients have smooth math falloff without GPU blur overhead.
 *   - ZERO JS/framer-motion animation loops or requestAnimationFrame timers running in the background.
 *   - ZERO SVG filter feTurbulence rasterization.
 *   - pointer-events-none, aria-hidden, fixed z-0, completely passive to layout & scrolling.
 */

import React from 'react';

export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      suppressHydrationWarning
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* ── Base ambient gradient — light mode ── */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 10% 10%, rgba(175,243,62,0.24) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 20%, rgba(52,211,153,0.20) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 50% 90%, rgba(251,191,36,0.12) 0%, transparent 60%)
          `,
        }}
      />

      {/* ── Base ambient gradient — dark mode ── */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 10% 10%, rgba(175,243,62,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 20%, rgba(52,211,153,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 50% 90%, rgba(251,191,36,0.10) 0%, transparent 60%)
          `,
        }}
      />

      {/* ── Static Blob 1: Lime-emerald glow (top-left) — zero blur filter ── */}
      <div
        className="absolute"
        style={{
          top: '-8%',
          left: '-6%',
          width: '55vw',
          height: '55vw',
          maxWidth: 800,
          maxHeight: 800,
          background: 'radial-gradient(circle at 45% 45%, rgba(175,243,62,0.32) 0%, rgba(74,222,128,0.16) 45%, transparent 70%)',
        }}
      />

      {/* ── Static Blob 2: Cyan-teal glow (top-right) — zero blur filter ── */}
      <div
        className="absolute"
        style={{
          top: '12%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          maxWidth: 700,
          maxHeight: 700,
          background: 'radial-gradient(circle at 55% 45%, rgba(34,211,238,0.26) 0%, rgba(52,211,153,0.14) 45%, transparent 70%)',
        }}
      />

      {/* ── Soft radial veil — ensures high text contrast ── */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.15)_100%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.45)_0%,rgba(2,6,23,0.20)_100%)]"
      />
    </div>
  );
}
