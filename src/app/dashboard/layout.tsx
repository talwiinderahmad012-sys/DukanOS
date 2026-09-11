import { requireActiveBusiness } from '@/lib/auth/guards';
import { isPlatformAdminEmail } from '@/lib/auth/platform-admin';
import { signOut } from '@/lib/auth/auth';
import { recordAuditLog } from '@/services/audit';
import { SidebarBusinessHeader } from '@/components/layout/sidebar-business-header';
import { SidebarBackButton } from '@/components/layout/sidebar-back-button';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DashboardNavSections } from '@/components/layout/nav-sections';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PageTransition } from '@/components/layout/page-transition';
import LiveAnalyticsRefresher from '@/components/analytics/live-analytics-refresher';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { SidebarStatusChip } from '@/components/layout/sidebar-status-chip';
import { AppFooter } from '@/components/layout/footer';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, membership: activeMembership, business: activeBusiness } = await requireActiveBusiness();

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
    /*
     * App shell — definite height h-[100dvh] is required.
     * See docs/STICKY_HEADER.md for the full audit.
     *
     * CRITICAL for Liquid Glass: bg-transparent on this wrapper lets the
     * AuroraBackground (fixed, z-0) shine through all panels.
     */
    <div className="flex h-[100dvh] min-h-0 grow flex-col bg-transparent transition-colors duration-200 md:flex-row md:pl-64">

      {/* Aurora background — fixed, z-0, full-screen colourful base */}
      <AuroraBackground />

      {/* Mobile Header & Nav */}
      <MobileNav
        businessName={activeBusiness.name}
        role={activeMembership.role}
        platformAdmin={platformAdmin}
        businessId={activeBusiness.id}
        userName={userLabel}
        logoutAction={logoutAction}
      />

      {/* Sidebar — translucent glass surface, z-40 */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:flex md:h-[100dvh] w-64 shrink-0 flex-col backdrop-blur-xl bg-white/55 dark:bg-slate-950/70 border-r border-white/50 dark:border-white/10 z-40 overflow-hidden no-scrollbar">
        <SidebarBusinessHeader businessName={activeBusiness.name} role={activeMembership.role} userName={userLabel} />
        <SidebarBackButton />
        <DashboardNavSections role={activeMembership.role} platformAdmin={platformAdmin} />
        <SidebarStatusChip />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 max-w-full overflow-hidden relative z-10">
        <DashboardHeader userName={userLabel} businessId={activeBusiness.id} role={activeMembership.role} logoutAction={logoutAction} />
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto overscroll-contain">
          <div className="flex-1">
            <PageTransition>
              {children}
            </PageTransition>
            <LiveAnalyticsRefresher />
          </div>
          <AppFooter dark />
        </div>
      </main>
    </div>
  );
}
