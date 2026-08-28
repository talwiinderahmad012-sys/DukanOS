/**
 * Centralized email normalization.
 *
 * All authentication flows (registration, login, invitation, password reset)
 * MUST use this function so that lookups and storage are consistent.
 *
 * Rule: trimmed + lowercased.
 */

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
