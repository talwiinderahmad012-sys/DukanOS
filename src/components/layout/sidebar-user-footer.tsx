'use client';

import { LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { useRoleLabel } from '@/components/layout/sidebar-business-header';

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
  const roleLabel = useRoleLabel();
  const displayName = userLabel || t('ui.userFallback');

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
          aria-hidden="true"
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900" title={displayName}>
            {displayName}
          </p>
          <p className="truncate text-xs font-medium capitalize text-muted">
            {roleLabel(role)}
          </p>
        </div>
      </div>
      <form action={logoutAction} className="mt-1">
        <button
          type="submit"
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-danger rtl-flip" aria-hidden="true" />
          <span>{t('nav.signOut', 'Sign out')}</span>
        </button>
      </form>
    </div>
  );
}
