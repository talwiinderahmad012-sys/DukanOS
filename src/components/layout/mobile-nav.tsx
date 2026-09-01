'use client';

import { useState } from 'react';
import { Menu, X, Store } from 'lucide-react';
import { DashboardNavSections } from '@/components/layout/nav-sections';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { useRoleLabel } from '@/components/layout/sidebar-business-header';
import { useTranslation } from '@/lib/i18n/language-context';
import { useModalA11y } from '@/lib/a11y/use-modal-a11y';
import { SignOutButton } from '@/components/layout/sign-out-button';

export function MobileNav({
  businessName,
  role,
  platformAdmin = false,
  businessId,
  userName,
  logoutAction,
}: {
  businessName: string;
  role: string;
  platformAdmin?: boolean;
  businessId: string;
  userName: string;
  logoutAction: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, isRTL } = useTranslation();
  const roleLabel = useRoleLabel();
  const displayName = userName || t('ui.userFallback');

  const close = () => setIsOpen(false);
  const drawerRef = useModalA11y(isOpen, close);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-surface border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-drawer"
              aria-haspopup="dialog"
              aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="min-w-0 truncate text-sm font-bold text-gray-900">{businessName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageToggle />
            <NotificationBell businessId={businessId} />
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[45] bg-gray-900/50 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        tabIndex={-1}
        aria-hidden={!isOpen}
        className={`md:hidden fixed inset-y-0 start-0 z-50 flex w-[19rem] max-w-[85vw] flex-col border-e border-border bg-surface transition-[transform,visibility] duration-200 ease-in-out ${
          isOpen ? 'visible translate-x-0' : isRTL ? 'invisible translate-x-full' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-gray-900" title={businessName}>
              {businessName}
            </h2>
            <p className="truncate text-xs font-medium capitalize text-muted">{roleLabel(role)}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t('common.close', 'Close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <DashboardNavSections role={role} platformAdmin={platformAdmin} variant="drawer" onNavigate={close} />

        {/* User account area */}
        <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
              <p className="truncate text-xs font-medium capitalize text-muted">{roleLabel(role)}</p>
            </div>
          </div>
          <SignOutButton
            logoutAction={logoutAction}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-danger-soft hover:text-danger"
          />
        </div>
      </div>
    </>
  );
}
