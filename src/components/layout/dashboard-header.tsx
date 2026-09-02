'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Settings, LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { NetworkStatusBadge, ConnectionBanner } from '@/components/pwa/pwa-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useRoleLabel } from '@/components/layout/sidebar-business-header';

export function DashboardHeader({
  userName,
  businessId,
  role,
  logoutAction,
}: {
  userName: string;
  businessId: string;
  role: string;
  logoutAction: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const displayName = userName || t('ui.userFallback');
  const initial = displayName.charAt(0).toUpperCase();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /*
   * ONE sticky unit: the connection banner (green brand bar / amber offline
   * bar) sits inside the same `sticky top-0 z-50` container as the header, so
   * the whole top region is pinned together instead of two `sticky top-0`
   * blocks stacking on top of each other.
   *
   * `main` (`overflow-hidden`) is the nearest scroll container, so `sticky` is
   * only a safety net here: the header is a flex SIBLING of the scrolling
   * `overflow-y-auto` page container, which makes it physically impossible for
   * it to scroll away. See docs/STICKY_HEADER.md.
   */
  return (
    <header className="sticky top-0 z-50 hidden w-full shrink-0 flex-col border-b border-border bg-surface md:flex">
      <ConnectionBanner />
      <div className="flex h-16 w-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <NetworkStatusBadge />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          <NotificationBell businessId={businessId} />
          <Link
            href="/dashboard/settings/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title={t('nav.notificationSettings')}
            aria-label={t('nav.notificationSettings')}
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-gray-900 transition-colors hover:bg-blue-100 dark:bg-primary-soft0/20 dark:text-blue-400 dark:hover:bg-primary-soft0/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title={t('nav.myWorkspace')}
              aria-label={t('nav.myWorkspaceOf', { name: displayName })}
              aria-expanded={isOpen}
              aria-haspopup="menu"
            >
              <span aria-hidden="true">{initial}</span>
            </button>

            {isOpen && (
              <div
                className="absolute end-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95"
                role="menu"
              >
                <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-semibold text-gray-900 truncate" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs font-medium capitalize text-muted truncate">
                    {roleLabel(role)}
                  </p>
                </div>
                <div className="py-1">
                  <form action={logoutAction} onSubmit={(e) => { e.preventDefault(); setIsOpen(false); }}>
                    <button
                      type="submit"
                      className="w-full text-start px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2.5"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                      <span>{t('nav.signOut', 'Sign out')}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
