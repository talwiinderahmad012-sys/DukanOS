'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { getDashboardNavigationSections } from '@/components/layout/dashboard-navigation';
import { useTranslation } from '@/lib/i18n/language-context';

export function isNavHrefActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavSections({
  role,
  platformAdmin = false,
  variant = 'sidebar',
  onNavigate,
}: {
  role: string;
  platformAdmin?: boolean;
  variant?: 'sidebar' | 'drawer';
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const sections = getDashboardNavigationSections(role, platformAdmin);
  const touch = variant === 'drawer';

  return (
    <nav aria-label={t('nav.dashboardNavigation')} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {sections.map((section, index) => {
        const translatedSectionLabel = section.translationKey 
          ? t(section.translationKey, section.label)
          : section.label;

        return (
          <div key={section.label} className={cn(index > 0 && 'mt-4')}>
            <p
              className={cn(
                'px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500',
                touch && 'pb-1.5',
              )}
            >
              {translatedSectionLabel}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavHrefActive(item.href, pathname);
                const translatedItemName = item.translationKey
                  ? t(item.translationKey, item.name)
                  : item.name;

                return (
                  <li key={item.href} className="relative">
                    {/* Active sliding indicator pill */}
                    {active && !shouldReduceMotion && (
                      <motion.div
                        layoutId={variant === 'drawer' ? 'active-nav-indicator-drawer' : 'active-nav-indicator'}
                        className="absolute inset-0 rounded-lg bg-primary-soft border border-primary/25 shadow-xs"
                        transition={{
                          type: 'spring',
                          damping: 30,
                          stiffness: 350,
                        }}
                        aria-hidden="true"
                      />
                    )}

                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                      data-sound="nav-click"
                      className={cn(
                        'relative z-10 flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150',
                        touch ? 'py-2.5' : 'py-2',
                        // Hover indent & highlight
                        'hover:translate-x-1 rtl:hover:-translate-x-1',
                        active
                          ? 'text-primary-hover font-semibold'
                          : 'text-gray-600 hover:bg-gray-50/70 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white',
                        // Fallback static highlight if reduced motion is enabled
                        active && shouldReduceMotion && 'bg-primary-soft border border-primary/20'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors duration-150',
                          active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600 dark:text-slate-400'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{translatedItemName}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
