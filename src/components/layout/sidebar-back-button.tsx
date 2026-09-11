'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigationHistory } from '@/lib/navigation/navigation-history';
import { useTranslation } from '@/lib/i18n/language-context';
import { cn } from '@/components/ui/cn';

interface SidebarBackButtonProps {
  className?: string;
  onNavigate?: () => void;
}

export function SidebarBackButton({ className, onNavigate }: SidebarBackButtonProps) {
  const { canGoBack, goBack } = useNavigationHistory();
  const { t, isRTL } = useTranslation();

  // Hidden on /dashboard root and non-dashboard pages (e.g. /login)
  if (!canGoBack) {
    return null;
  }

  const Icon = isRTL ? ArrowRight : ArrowLeft;
  const backLabel = t('common.back', 'Back');
  const tooltip = `${backLabel} (Alt+←)`;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    }
    goBack();
  };

  return (
    <div className={cn('px-3 pt-2 pb-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        aria-label={tooltip}
        data-sound="back"
        className="group flex w-full items-center gap-2.5 rounded-xl border border-white/40 bg-white/60 dark:border-white/10 dark:bg-white/10 px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:bg-white/80 dark:hover:bg-white/15 hover:text-gray-900 active:scale-[0.98] dark:text-gray-300 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
      >
        <Icon
          className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 dark:text-gray-400 dark:group-hover:text-white"
          aria-hidden="true"
        />
        <span className="truncate">{backLabel}</span>
        <kbd className="ms-auto hidden rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-gray-700 sm:inline-block">
          Alt+←
        </kbd>
      </button>
    </div>
  );
}

export function MobileHeaderBackButton({ className }: { className?: string }) {
  const { canGoBack, goBack } = useNavigationHistory();
  const { t, isRTL } = useTranslation();

  // Hidden on /dashboard root
  if (!canGoBack) {
    return null;
  }

  const Icon = isRTL ? ArrowRight : ArrowLeft;
  const backLabel = t('common.back', 'Back');
  const tooltip = `${backLabel} (Alt+←)`;

  return (
    <button
      type="button"
      onClick={goBack}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        'btn-3d flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 dark:text-gray-200 cursor-pointer',
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden="true" />
    </button>
  );
}

