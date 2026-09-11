'use client';

import React from 'react';
import { PoweredByHexframe } from '@/components/brand/PoweredByHexframe';

/**
 * AppFooter — single-line footer for all public, auth, onboarding, and
 * dashboard pages.
 *
 * Layout:
 *   left:  © {year} DukaanOS
 *   right: [powered by HEXFRAME lockup]
 *
 * Designed to sit BELOW scrollable content, never overlapping sticky headers
 * or the dashboard sidebar.
 *
 * Props:
 *   dark — use on dark-background pages (inverted text palette)
 */
export function AppFooter({ dark = false }: { dark?: boolean }) {
  const year = new Date().getFullYear();

  const copyColor = dark
    ? 'rgba(148,163,184,0.7)'   // slate-400/70 — readable on dark glass
    : 'rgba(100,116,139,0.65)'; // slate-500/65 — muted on light

  return (
    <footer
      className="w-full shrink-0 border-t border-gray-200/60 dark:border-white/10"
      style={{ backdropFilter: 'none' }}
    >
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Copyright */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: copyColor,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          © {year} DukaanOS
        </span>

        {/* Powered-by lockup */}
        <PoweredByHexframe light={dark} />
      </div>
    </footer>
  );
}
