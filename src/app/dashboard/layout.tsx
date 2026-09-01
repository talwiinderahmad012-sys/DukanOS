import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { isPlatformAdminEmail } from '@/lib/auth/platform-admin';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth/auth';
import { recordAuditLog } from '@/services/audit';
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
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set('dukaanos_active_business_id', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
    cookieStore.set('dukaanos_active_branch_id', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
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
  const platformAdmin = isPlatformAdminEmail(user.email);

  return (
    <div className="h-[100dvh] bg-page transition-colors duration-200 flex flex-col md:flex-row md:pl-64">

      {/* Mobile Header & Nav */}
      <MobileNav
        businessName={activeBusiness.name}
        role={activeMembership.role}
        platformAdmin={platformAdmin}
        businessId={activeBusiness.id}
        userName={userLabel}
        logoutAction={logoutAction}
      />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:flex md:h-[100dvh] w-64 shrink-0 flex-col border-e border-border bg-surface">
        {/* Business context */}
        <SidebarBusinessHeader businessName={activeBusiness.name} role={activeMembership.role} />

        {/* Navigation Links */}
        <DashboardNavSections role={activeMembership.role} platformAdmin={platformAdmin} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 max-w-full overflow-hidden">
        {/* Top Header */}
        <DashboardHeader userName={userLabel} businessId={activeBusiness.id} role={activeMembership.role} logoutAction={logoutAction} />

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
          <LiveAnalyticsRefresher />
        </div>
      </main>
    </div>
  );
}
