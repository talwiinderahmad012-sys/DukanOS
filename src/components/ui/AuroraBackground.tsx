'use client';

/**
 * AuroraBackground — dramatic full-screen animated gradient layer.
 *
 * Why this replaces AmbientBlobs:
 *   - Old blobs were 8–18% opacity with heavy blur — invisible behind white bg.
 *   - This version uses 35–55% opacity blobs + a base gradient so color is ALWAYS
 *     visible on both light and dark mode.
 *   - Uses framer-motion animate loop (not CSS keyframes) for smoother drift
 *     that works in all browsers without CSS animation support gaps.
 *
 * Safety:
 *   - pointer-events-none, aria-hidden, fixed z-0
 *   - prefers-reduced-motion: blobs are visible but static (no animate loop)
 *   - GPU-composited: only transform and opacity change
 */

import React from 'react';
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';

interface BlobProps {
  className: string;
  style: React.CSSProperties;
  animate?: TargetAndTransition;
  transition?: Transition;
}

function Blob({ className, style, animate, transition }: BlobProps) {
  return (
    <motion.div
      className={className}
      style={style}
      animate={animate}
      transition={transition}
    />
  );
}

export function AuroraBackground() {
  const shouldReduceMotion = useReducedMotion();

  const blobTransition = (duration: number, delay = 0): Transition =>
    shouldReduceMotion
      ? {}
      : {
          duration,
          delay,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* ── Base gradient — always visible, sets the colour tone ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 10%, rgba(175,243,62,0.22) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 85% 25%, rgba(52,211,153,0.20) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 50% 85%, rgba(251,191,36,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 70% 60%, rgba(139,92,246,0.14) 0%, transparent 50%)
          `,
        }}
      />

      {/* ── Dark mode base — rich deep aurora ── */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 10%, rgba(175,243,62,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 85% 25%, rgba(52,211,153,0.16) 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 50% 85%, rgba(251,191,36,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 70% 60%, rgba(139,92,246,0.14) 0%, transparent 50%)
          `,
        }}
      />

      {/* ── Blob 1: Lime-green — top-left ── */}
      <Blob
        className="absolute rounded-full"
        style={{
          top: '-10%',
          left: '-8%',
          width: '65vw',
          height: '65vw',
          maxWidth: 900,
          maxHeight: 900,
          background: 'radial-gradient(circle at 40% 40%, rgba(175,243,62,0.55) 0%, rgba(74,222,128,0.35) 40%, transparent 70%)',
          filter: 'blur(72px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
        animate={shouldReduceMotion ? {} : {
          x: [0, 80, -40, 60, 0],
          y: [0, -70, 50, -30, 0],
          scale: [1, 1.12, 0.94, 1.08, 1],
        }}
        transition={blobTransition(22)}
      />

      {/* ── Blob 2: Teal-cyan — right-center ── */}
      <Blob
        className="absolute rounded-full"
        style={{
          top: '20%',
          right: '-12%',
          width: '55vw',
          height: '55vw',
          maxWidth: 750,
          maxHeight: 750,
          background: 'radial-gradient(circle at 60% 40%, rgba(34,211,238,0.50) 0%, rgba(52,211,153,0.38) 45%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
        animate={shouldReduceMotion ? {} : {
          x: [0, -90, 50, -60, 0],
          y: [0, 60, -80, 40, 0],
          scale: [1, 0.92, 1.10, 0.96, 1],
        }}
        transition={blobTransition(26, 3)}
      />

      {/* ── Blob 3: Violet-purple — bottom-left ── */}
      <Blob
        className="absolute rounded-full"
        style={{
          bottom: '-15%',
          left: '5%',
          width: '50vw',
          height: '50vw',
          maxWidth: 680,
          maxHeight: 680,
          background: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.45) 0%, rgba(139,92,246,0.30) 50%, transparent 70%)',
          filter: 'blur(90px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
        animate={shouldReduceMotion ? {} : {
          x: [0, 60, -50, 80, 0],
          y: [0, 50, -60, 30, 0],
          scale: [1, 1.08, 0.95, 1.05, 1],
        }}
        transition={blobTransition(20, 6)}
      />

      {/* ── Blob 4: Amber-gold — bottom-right ── */}
      <Blob
        className="absolute rounded-full"
        style={{
          bottom: '5%',
          right: '-5%',
          width: '40vw',
          height: '40vw',
          maxWidth: 560,
          maxHeight: 560,
          background: 'radial-gradient(circle at 50% 60%, rgba(251,191,36,0.48) 0%, rgba(245,158,11,0.32) 50%, transparent 70%)',
          filter: 'blur(70px)',
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
        animate={shouldReduceMotion ? {} : {
          x: [0, -70, 40, -50, 0],
          y: [0, -50, 60, -40, 0],
          scale: [1, 1.06, 0.92, 1.04, 1],
        }}
        transition={blobTransition(18, 9)}
      />

      {/* ── Subtle noise grain overlay for premium depth ── */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  );
}
