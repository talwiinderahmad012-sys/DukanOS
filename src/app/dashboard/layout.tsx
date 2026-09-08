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
import { AmbientBlobs } from '@/components/ui/AmbientBlobs';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Canonical active-business resolution (auth + membership lookup + active
  // business cookie handling) lives in getActiveBusiness; the layout must not
  // duplicate it. Unauthenticated -> /login; authenticated with no membership
  // -> /onboarding (both matching prior behavior).
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
     * App shell — this wrapper owns a DEFINITE height (`h-[100dvh]`).
     *
     * Why the definite height is mandatory: `min-h-*` alone leaves every level
     * of this flex chain auto-sized, so once a page is taller than the viewport
     * the chain simply grows, the inner `overflow-y-auto` container never
     * overflows (it never becomes the scroller) and the DOCUMENT scrolls
     * instead. Because `<main>` is `overflow-hidden` — which makes it a scroll
     * container that never scrolls — `position: sticky` on the header then
     * resolves against `<main>` instead of the viewport and silently does
     * nothing: the header scrolls away. Giving the shell `h-[100dvh]` bounds
     * the chain, turns the page container into the real scroller, and the
     * document stops scrolling entirely.
     *
     * See docs/STICKY_HEADER.md for the full audit.
     */
    <div className="flex h-[100dvh] min-h-0 grow flex-col bg-page transition-colors duration-200 md:flex-row md:pl-64">

      {/* Ambient colourful blobs — z-0, fixed, behind all chrome */}
      <AmbientBlobs />

      {/* Mobile Header & Nav */}
      <MobileNav
        businessName={activeBusiness.name}
        role={activeMembership.role}
        platformAdmin={platformAdmin}
        businessId={activeBusiness.id}
        userName={userLabel}
        logoutAction={logoutAction}
      />

      {/* Sidebar (Desktop) — glass-strong over the ambient blobs */}
      <aside className="hidden md:fixed md:top-0 md:left-0 md:flex md:h-[100dvh] w-64 shrink-0 flex-col glass-strong border-e border-white/30 dark:border-white/10 z-40">
        {/* Business context */}
        <SidebarBusinessHeader businessName={activeBusiness.name} role={activeMembership.role} />

        {/* Back navigation */}
        <SidebarBackButton />

        {/* Navigation Links */}
        <DashboardNavSections role={activeMembership.role} platformAdmin={platformAdmin} />
      </aside>

      {/*
        Main Content Area — `overflow-hidden` clips horizontal overflow (wide
        tables) and, together with the definite shell height above, bounds the
        scroller below it.

        The header is a SIBLING of that scroller, so it is pinned by layout
        alone; `sticky top-0` on the header is a safety net that costs nothing.
      */}
      <main className="flex-1 flex flex-col min-h-0 max-w-full overflow-hidden relative z-10">
        {/* Top Header — glass over blobs */}
        <DashboardHeader userName={userLabel} businessId={activeBusiness.id} role={activeMembership.role} logoutAction={logoutAction} />

        {/* Page Content (the only scroller on dashboard routes) */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto overscroll-contain">
          <PageTransition>
            {children}
          </PageTransition>
          <LiveAnalyticsRefresher />
        </div>
      </main>
    </div>
  );
}
