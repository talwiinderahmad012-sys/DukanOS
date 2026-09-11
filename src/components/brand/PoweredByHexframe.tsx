'use client';

import React from 'react';
import { HexframeLogo } from './HexframeLogo';

/**
 * PoweredByHexframe — subtle "powered by HEXFRAME" lockup.
 *
 * Props:
 *   light — pass true on dark backgrounds (white FRAME text)
 *   className — optional extra classes on the wrapper
 */
export function PoweredByHexframe({
  light = false,
  className = '',
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label="Powered by Hexframe"
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.05em',
          color: light ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.85)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        powered by
      </span>
      <HexframeLogo size="sm" withIcon light={light} />
    </span>
  );
}
