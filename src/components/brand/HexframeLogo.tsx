'use client';

import React from 'react';

/**
 * HexframeLogo — inline SVG rounded-hexagon outline + "HEX|FRAME" wordmark.
 *
 * Props:
 *   size    — 'sm' (default) | 'md'
 *   withIcon — show the hexagon icon (default true)
 *   light    — use white wordmark FRAME colour for dark surfaces (default false)
 */
export interface HexframeLogoProps {
  size?: 'sm' | 'md';
  withIcon?: boolean;
  light?: boolean;
  className?: string;
}

const SIZES = {
  sm: { hex: 18, gap: 5, hexText: 11, frameText: 11, tracking: '0.08em' },
  md: { hex: 26, gap: 7, hexText: 16, frameText: 16, tracking: '0.09em' },
};

/**
 * Rounded-hexagon outline SVG in teal (#14b8a6).
 * The hexagon is drawn as a polygon clipped to a rounded rect
 * via a clipPath trick — no filter, no blur, clean vector.
 */
function HexIcon({ size }: { size: number }) {
  const s = size;
  // Flat-top hexagon vertices at a given radius, centered in viewBox
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.44; // leave a thin margin for the stroke
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // flat-top
    return `${(cx + r * Math.cos(angle)).toFixed(3)},${(cy + r * Math.sin(angle)).toFixed(3)}`;
  }).join(' ');

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <polygon
        points={points}
        stroke="#14b8a6"
        strokeWidth={s * 0.09}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner micro-dot accent */}
      <circle cx={cx} cy={cy} r={s * 0.1} fill="#14b8a6" opacity={0.7} />
    </svg>
  );
}

export function HexframeLogo({
  size = 'sm',
  withIcon = true,
  light = false,
  className = '',
}: HexframeLogoProps) {
  const dim = SIZES[size];

  return (
    <span
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: dim.gap, lineHeight: 1 }}
    >
      {withIcon && <HexIcon size={dim.hex} />}
      <span
        style={{
          fontSize: dim.hexText,
          fontWeight: 700,
          letterSpacing: dim.tracking,
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: '#14b8a6' }}>HEX</span>
        <span style={{ color: light ? '#ffffff' : '#0f172a' }}>FRAME</span>
      </span>
    </span>
  );
}
