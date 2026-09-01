'use client';

import { useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

const AUTH_COOKIES = ['dukaanos_active_business_id', 'dukaanos_active_branch_id'];

const AUTH_LOCAL_PREFIXES = ['dukaanos:auth', 'dukaanos:session'];

function clearAuthCookies(): void {
  for (const name of AUTH_COOKIES) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

function clearAuthLocalState(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && AUTH_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
  }
  try {
    sessionStorage.clear();
  } catch {
  }
}

export function SignOutButton({
  logoutAction,
  className,
}: {
  logoutAction: () => Promise<void>;
  className?: string;
}) {
  const { t } = useTranslation();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearAuthCookies();
      clearAuthLocalState();
      await logoutAction();
    },
    [logoutAction]
  );

  return (
    <form action={logoutAction} onSubmit={handleSubmit} className="mt-1">
      <button type="submit" className={className}>
        <LogOut className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-danger rtl-flip" aria-hidden="true" />
        <span>{t('nav.signOut', 'Sign out')}</span>
      </button>
    </form>
  );
}
