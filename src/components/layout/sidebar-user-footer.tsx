'use client';

import { LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export function SidebarUserFooter({
  userLabel,
  role,
  logoutAction,
}: {
  userLabel: string;
  role: string;
  logoutAction: () => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
          aria-hidden="true"
        >
          {userLabel.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900" title={userLabel}>
            {userLabel}
          </p>
          <p className="truncate text-xs font-medium capitalize text-muted">
            {role.toLowerCase()}
          </p>
        </div>
      </div>
      <form action={logoutAction} className="mt-1">
        <button
          type="submit"
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-danger" aria-hidden="true" />
          <span>{t('nav.signOut', 'Sign out')}</span>
        </button>
      </form>
    </div>
  );
}
