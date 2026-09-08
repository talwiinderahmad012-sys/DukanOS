'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface NavigationHistoryContextType {
  history: string[];
  canGoBack: boolean;
  previousPath: string | null;
  currentPath: string;
  goBack: () => void;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

function isAllowedDashboardPath(path: string | null): boolean {
  if (!path) return false;
  // Must be within the dashboard app shell, excluding auth or logout routes
  return (
    path.startsWith('/dashboard') &&
    path !== '/login' &&
    !path.startsWith('/auth') &&
    !path.startsWith('/api')
  );
}

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // In-app route history stack (max 50 entries to avoid unbounded growth)
  const [history, setHistory] = useState<string[]>(() => {
    return isAllowedDashboardPath(pathname) ? [pathname] : [];
  });

  const isNavigatingBackRef = useRef(false);
  const targetPathRef = useRef<string | null>(null);

  // Synchronize history when pathname changes
  useEffect(() => {
    if (!pathname || !isAllowedDashboardPath(pathname)) {
      return;
    }

    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      const target = targetPathRef.current;
      targetPathRef.current = null;

      setHistory((prev) => {
        if (!target) return prev;
        const targetIdx = prev.lastIndexOf(target);
        if (targetIdx >= 0) {
          return prev.slice(0, targetIdx + 1);
        }
        return [pathname];
      });
      return;
    }

    // Normal forward navigation or browser popstate
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last === pathname) {
        return prev; // Same page, no duplication
      }

      // If browser back was pressed and matches penultimate entry
      if (prev.length >= 2 && prev[prev.length - 2] === pathname) {
        return prev.slice(0, prev.length - 1);
      }

      // Append new route, capping max depth
      return [...prev.slice(-49), pathname];
    });
  }, [pathname]);

  // Determine if Back action is permitted:
  // Allowed on any dashboard sub-page or section, but hidden/disabled on /dashboard root or non-dashboard pages
  const canGoBack = Boolean(
    pathname &&
    pathname.startsWith('/dashboard') &&
    pathname !== '/dashboard'
  );

  // Look for the most recent preceding valid route
  const previousPath = useMemo(() => {
    for (let i = history.length - 2; i >= 0; i--) {
      const candidate = history[i];
      if (candidate && candidate !== pathname && isAllowedDashboardPath(candidate)) {
        return candidate;
      }
    }
    return null;
  }, [history, pathname]);

  const goBack = useCallback(() => {
    if (!pathname || pathname === '/dashboard' || !pathname.startsWith('/dashboard')) {
      return;
    }

    // Identify target: previous in-app route, or fallback to /dashboard
    let target = previousPath;
    if (!target || !isAllowedDashboardPath(target) || target === pathname) {
      target = '/dashboard';
    }

    // Safety guard: never navigate to /login or leave the app
    if (target === '/login' || !target.startsWith('/dashboard')) {
      target = '/dashboard';
    }

    isNavigatingBackRef.current = true;
    targetPathRef.current = target;
    router.push(target);
  }, [pathname, previousPath, router]);

  // Keyboard shortcut listener for Alt+Left / Alt+ArrowLeft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        (e.key === 'ArrowLeft' || e.key === 'Left')
      ) {
        if (canGoBack) {
          e.preventDefault();
          goBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canGoBack, goBack]);

  const value = useMemo(
    () => ({
      history,
      canGoBack,
      previousPath,
      currentPath: pathname || '',
      goBack,
    }),
    [history, canGoBack, previousPath, pathname, goBack]
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory(): NavigationHistoryContextType {
  const context = useContext(NavigationHistoryContext);
  if (!context) {
    throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider');
  }
  return context;
}

