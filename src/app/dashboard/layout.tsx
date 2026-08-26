import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Store, Settings } from 'lucide-react';
import { signOut } from '@/lib/auth/auth';
import { recordAuditLog } from '@/services/audit';
import { SidebarUserFooter } from '@/components/layout/sidebar-user-footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DashboardNavSections } from '@/components/layout/nav-sections';
import { NetworkStatusBadge } from '@/components/pwa/pwa-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import LiveAnalyticsRefresher from '@/components/analytics/live-analytics-refresher';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Canonical active-business resolution (auth + membership lookup + active
  // business cookie handling) lives in getActiveBusiness; the layout must not
  // duplicate it. Unauthenticated -> /login; authenticated with no membership
  // -> /onboarding (both matching prior behavior).
  const { user, membership: activeMembership, business: activeBusiness } = await getActiveBusiness().catch((err) => {
    if (err instanceof Error && err.message === 'NO_BUSINESS') redirect('/onboarding');
    redirect('/login');
  });

  async function logoutAction() {
    'use server';
    const userId = user.id;
    await signOut();
    await recordAuditLog({
      businessId: activeBusiness.id,
      userId,
      action: 'LOGOUT',
      entityType: 'Auth',
      entityId: userId,
      metadata: { businessId: activeBusiness.id },
    }).catch(() => {});
  }

  const userLabel = user.name?.trim() || user.email || 'User';

  return (
    <div className="min-h-screen bg-page transition-colors duration-200 flex flex-col md:flex-row">

      {/* Mobile Header & Nav */}
      <MobileNav
        businessName={activeBusiness.name}
        role={activeMembership.role}
        businessId={activeBusiness.id}
        userName={userLabel}
        logoutAction={logoutAction}
      />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
        {/* Business context */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-gray-900" title={activeBusiness.name}>
              {activeBusiness.name}
            </h2>
            <p className="truncate text-xs font-medium capitalize text-muted">
              {activeMembership.role.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <DashboardNavSections role={activeMembership.role} />

        {/* User account area */}
        <SidebarUserFooter
          userLabel={userLabel}
          role={activeMembership.role}
          logoutAction={logoutAction}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="hidden md:flex bg-surface border-b border-border h-16 items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <NetworkStatusBadge />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <NotificationBell businessId={activeBusiness.id} />
            <Link
              href="/dashboard/settings/notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Notification Settings"
              aria-label="Notification settings"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard/me"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="My Workspace"
              aria-label={`My Workspace (${userLabel})`}
            >
              <span aria-hidden="true">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
          <LiveAnalyticsRefresher />
        </div>
      </main>
    </div>
  );
}
