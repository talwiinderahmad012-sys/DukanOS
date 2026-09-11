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
import { ConnectionBanner } from '@/components/pwa/pwa-provider';
import { SidebarBackButton, MobileHeaderBackButton } from '@/components/layout/sidebar-back-button';

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
      {/*
        Mobile Header — ONE sticky unit (banner + bar): sticky top-0, opaque
        (`bg-surface`), above page content (z-50) and below the nav drawer
        (z-[60]) and modals. It is a flex SIBLING of the scrolling page
        container, so it can never scroll away on any viewport.
      */}
      <div className="md:hidden sticky top-0 z-50 w-full shrink-0 bg-surface pt-[env(safe-area-inset-top)]">
        <ConnectionBanner />
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-drawer"
              aria-haspopup="dialog"
              aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="btn-3d flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 dark:text-gray-200"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <MobileHeaderBackButton />
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
        className={`md:hidden fixed inset-0 z-[55] bg-gray-900/50 transition-opacity duration-200 ${
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
        className={`md:hidden fixed inset-y-0 start-0 z-[60] flex w-[19rem] max-w-[85vw] flex-col border-e border-white/50 dark:border-white/10 backdrop-blur-2xl bg-white/85 dark:bg-slate-950/85 shadow-2xl transition-[transform,visibility] duration-200 ease-in-out ${
          isOpen ? 'visible translate-x-0' : isRTL ? 'invisible translate-x-full' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/40 dark:border-white/10 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div className="surface-glass flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[2px] bg-gradient-to-tr from-lime-400 via-emerald-400 to-teal-400 shadow-xs">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900 font-bold text-xs text-slate-800 dark:text-slate-100">
                {(displayName.charAt(0) || 'U').toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xs font-bold text-slate-900 dark:text-white" title={businessName}>
                {businessName}
              </h2>
              <p className="truncate text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{roleLabel(role)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t('common.close', 'Close')}
            className="btn-3d flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 dark:text-gray-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <SidebarBackButton onNavigate={close} />

        <DashboardNavSections role={role} platformAdmin={platformAdmin} variant="drawer" onNavigate={close} />

        {/* User account area & Online status */}
        <div className="border-t border-white/40 dark:border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
          <div className="surface-glass flex items-center justify-between rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-200">Online</span>
            </div>
            <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">v1.0.0</span>
          </div>

          <SignOutButton
            logoutAction={logoutAction}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-danger-soft hover:text-danger dark:text-slate-300"
          />
        </div>
      </div>
    </>
  );
}
