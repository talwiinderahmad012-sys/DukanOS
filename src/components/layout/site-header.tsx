'use client';

import Link from 'next/link';
import { Store } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ConnectionBanner } from '@/components/pwa/pwa-provider';

/**
 * Shared public-facing top bar (home, auth, onboarding, feedback, errors).
 *
 * Positioning contract (see docs/STICKY_HEADER.md):
 *  - ONE sticky wrapper (`sticky top-0 z-50`) holds the connection banner and
 *    the bar, so the whole top area is pinned as a single unit.
 *  - z-50 -> above all page content, below modals/dialogs/toasts (z-[60]+).
 *  - Fully OPAQUE background (`bg-white`) so page content scrolling underneath
 *    can never bleed through. No `backdrop-blur` is used, because a blurred
 *    translucent surface would let content show through on fast scrolls.
 *  - Dark mode needs no `dark:` variants here: `globals.css` remaps the whole
 *    gray palette under `.dark` (and `.dark .bg-white` swaps the surface), so
 *    the bar is opaque in both themes.
 *
 * The header must never be a descendant of an `overflow-hidden` /
 * `overflow-auto` element, otherwise `position: sticky` silently stops working.
 */
export function SiteHeader({
  homeHref = '/',
  showThemeToggle = true,
  showLanguageToggle = true,
}: {
  homeHref?: string;
  showThemeToggle?: boolean;
  showLanguageToggle?: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <ConnectionBanner />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-2 rounded-lg text-gray-900 transition-opacity hover:opacity-80"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary"
            aria-hidden="true"
          >
            <Store className="h-4 w-4 text-white" />
          </span>
          <span className="truncate text-sm font-bold tracking-tight">DukaanOS</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {showThemeToggle && <ThemeToggle />}
          {showLanguageToggle && <LanguageToggle />}
        </div>
      </div>
    </header>
  );
}
