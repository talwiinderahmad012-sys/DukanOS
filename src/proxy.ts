import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

/**
 * Edge-level route protection.
 *
 * The dashboard layout (`src/app/dashboard/layout.tsx`) and the onboarding
 * server action (`submitOnboardingAction`) already enforce auth server-side,
 * but middleware is the canonical, fast redirect that runs BEFORE any protected
 * page or layout renders. It is the layer that keeps `/onboarding` (a client
 * component with no layout guard of its own) from being served to anonymous
 * users, and it gives defense-in-depth for the whole private surface.
 *
 * Auth is JWT-based (stateless) with a 30-day `maxAge`, so a valid
 * `authjs.session-token` cookie survives server restarts and is honored here —
 * persistence is preserved, not broken.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/onboarding'];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth?.user);
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) =>
      nextUrl.pathname === prefix ||
      nextUrl.pathname.startsWith(`${prefix}/`),
  );

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    // Preserve the originally requested path so a post-login redirect can
    // return the user to where they intended to go.
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Protect the dashboard tree and the onboarding page. Public routes (/, /login,
  // /register, static pages, /api/*) are intentionally excluded so the NextAuth
  // callback routes, health checks, and cron remain reachable without a session.
  matcher: ['/dashboard/:path*', '/onboarding/:path*'],
};
