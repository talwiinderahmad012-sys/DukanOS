import 'server-only';
import { redirect } from 'next/navigation';
import { AppError, ErrorCodes } from '@/lib/errors';
import { getActiveBusiness } from './getActiveBusiness';

/**
 * Route-guard for dashboard pages.
 *
 * Replaces the old `getActiveBusiness().catch(() => redirect('/onboarding'))`
 * pattern, which funnelled EVERY failure — including transient database
 * errors — into an /onboarding redirect, producing infinite redirect loops.
 *
 * Behaviour:
 *  - unauthenticated              → redirect('/login')
 *  - authenticated, no business   → redirect('/onboarding')
 *  - anything else (transient DB failure, etc.) → rethrown → error page
 */
export async function requireActiveBusiness() {
  try {
    return await getActiveBusiness();
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCodes.UNAUTHENTICATED) {
      redirect('/login');
    }
    if (error instanceof Error && error.message === 'NO_BUSINESS') {
      redirect('/onboarding');
    }
    throw error;
  }
}