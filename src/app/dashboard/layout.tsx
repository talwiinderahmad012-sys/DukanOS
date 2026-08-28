import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth/auth';
import { recordAuditLog } from '@/services/audit';
import { SidebarUserFooter } from '@/components/layout/sidebar-user-footer';
import { SidebarBusinessHeader } from '@/components/layout/sidebar-business-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DashboardNavSections } from '@/components/layout/nav-sections';
import { DashboardHeader } from '@/components/layout/dashboard-header';
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

  const userLabel = user.name?.trim() || user.email || '';

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
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen w-64 shrink-0 flex-col border-e border-border bg-surface">
        {/* Business context */}
        <SidebarBusinessHeader businessName={activeBusiness.name} role={activeMembership.role} />

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
        <DashboardHeader userName={userLabel} businessId={activeBusiness.id} />

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
          <LiveAnalyticsRefresher />
        </div>
      </main>
    </div>
  );
}
