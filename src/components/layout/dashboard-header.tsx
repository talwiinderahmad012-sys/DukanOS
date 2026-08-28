'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { NetworkStatusBadge } from '@/components/pwa/pwa-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function DashboardHeader({
  userName,
  businessId,
}: {
  userName: string;
  businessId: string;
}) {
  const { t } = useTranslation();
  const displayName = userName || t('ui.userFallback');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="hidden md:flex bg-surface border-b border-border h-16 items-center justify-between px-6 shrink-0">
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
        <Link
          href="/dashboard/me"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-gray-900 transition-colors hover:bg-blue-100 dark:bg-primary-soft0/20 dark:text-blue-400 dark:hover:bg-primary-soft0/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={t('nav.myWorkspace')}
          aria-label={t('nav.myWorkspaceOf', { name: displayName })}
        >
          <span aria-hidden="true">{initial}</span>
        </Link>
      </div>
    </header>
  );
}
