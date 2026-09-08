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

const SECTION_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  Overview: { bg: 'bg-blue-500/15 dark:bg-blue-400/20', text: 'text-blue-700 dark:text-blue-300' },
  Sales: { bg: 'bg-emerald-500/15 dark:bg-emerald-400/20', text: 'text-emerald-700 dark:text-emerald-300' },
  Insights: { bg: 'bg-purple-500/15 dark:bg-purple-400/20', text: 'text-purple-700 dark:text-purple-300' },
  Communication: { bg: 'bg-cyan-500/15 dark:bg-cyan-400/20', text: 'text-cyan-700 dark:text-cyan-300' },
  People: { bg: 'bg-amber-500/15 dark:bg-amber-400/20', text: 'text-amber-700 dark:text-amber-300' },
  Inventory: { bg: 'bg-teal-500/15 dark:bg-teal-400/20', text: 'text-teal-700 dark:text-teal-300' },
  Finance: { bg: 'bg-rose-500/15 dark:bg-rose-400/20', text: 'text-rose-700 dark:text-rose-300' },
  Platform: { bg: 'bg-indigo-500/15 dark:bg-indigo-400/20', text: 'text-indigo-700 dark:text-indigo-300' },
  Settings: { bg: 'bg-slate-500/15 dark:bg-slate-400/20', text: 'text-slate-700 dark:text-slate-300' },
  General: { bg: 'bg-slate-500/15 dark:bg-slate-400/20', text: 'text-slate-700 dark:text-slate-300' },
};

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
    <nav
      aria-label={t('nav.dashboardNavigation')}
      className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-3"
    >
      {sections.map((section, index) => {
        const translatedSectionLabel = section.translationKey
          ? t(section.translationKey, section.label)
          : section.label;
        const chipColor = SECTION_CHIP_COLORS[section.label] ?? SECTION_CHIP_COLORS.General;

        return (
          <div key={section.label} className={cn(index > 0 && 'pt-1')}>
            <p
              className={cn(
                'px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 select-none',
                touch && 'pb-1.5 pt-1.5'
              )}
            >
              {translatedSectionLabel}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isNavHrefActive(item.href, pathname);
                const translatedItemName = item.translationKey
                  ? t(item.translationKey, item.name)
                  : item.name;

                return (
                  <li key={item.href} className="relative">
                    {/* Active sliding indicator pill with brand lime gradient & soft glow */}
                    {active && !shouldReduceMotion && (
                      <motion.div
                        layoutId={variant === 'drawer' ? 'active-nav-indicator-drawer' : 'active-nav-indicator'}
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-lime-400 to-green-500 shadow-md shadow-lime-500/25 border border-lime-300/40"
                        transition={{
                          type: 'spring',
                          damping: 28,
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
                        'group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                        touch ? 'py-2.5' : 'py-2',
                        // Hover: bg-white/45, translate-x-1 slide, RTL: -translate-x-1
                        !active &&
                          'text-slate-700 hover:bg-white/45 hover:text-slate-950 hover:translate-x-1 rtl:hover:-translate-x-1 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
                        active && 'text-slate-950 font-bold shadow-xs',
                        // Fallback static highlight if reduced motion is enabled
                        active &&
                          shouldReduceMotion &&
                          'rounded-xl bg-gradient-to-r from-lime-400 to-green-500 text-slate-950 font-bold shadow-md shadow-lime-500/25'
                      )}
                    >
                      {/* Icon inside tinted chip */}
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 shadow-2xs',
                          active
                            ? 'bg-black/15 text-slate-950 dark:bg-black/20 dark:text-slate-950 font-bold'
                            : cn(chipColor.bg, chipColor.text)
                        )}
                        aria-hidden="true"
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
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
