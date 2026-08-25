'use client';

import { useEffect, useState } from 'react';
import { Menu, X, Store, LogOut } from 'lucide-react';
import { DashboardNavSections } from '@/components/layout/nav-sections';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function MobileNav({
  businessName,
  role,
  businessId,
  userName,
  logoutAction,
}: {
  businessName: string;
  role: string;
  businessId: string;
  userName: string;
  logoutAction: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-surface border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-2">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-drawer"
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="min-w-0 truncate text-sm font-bold text-gray-900">{businessName}</span>
          </div>
          <div className="flex shrink-0 items-center">
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
        aria-hidden={!isOpen}
        className={`md:hidden fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[85vw] flex-col border-r border-border bg-surface transition-[transform,visibility] duration-200 ease-in-out ${
          isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
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
            <p className="truncate text-xs font-medium capitalize text-muted">{role.toLowerCase()}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <DashboardNavSections role={role} variant="drawer" onNavigate={close} />

        {/* User account area */}
        <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary"
              aria-hidden="true"
            >
              {userName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900" title={userName}>
                {userName}
              </p>
              <p className="truncate text-xs font-medium capitalize text-muted">{role.toLowerCase()}</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-1">
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-danger" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
