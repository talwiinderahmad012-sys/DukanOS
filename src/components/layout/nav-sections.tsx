'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/cn';
import { getDashboardNavigationSections } from '@/components/layout/dashboard-navigation';

export function isNavHrefActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavSections({
  role,
  variant = 'sidebar',
  onNavigate,
}: {
  role: string;
  variant?: 'sidebar' | 'drawer';
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = getDashboardNavigationSections(role);
  const touch = variant === 'drawer';

  return (
    <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {sections.map((section, index) => (
        <div key={section.label} className={cn(index > 0 && 'mt-4')}>
          <p
            className={cn(
              'px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400',
              touch && 'pb-1.5',
            )}
          >
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isNavHrefActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      touch ? 'py-2.5' : 'py-2',
                      active
                        ? 'bg-primary-soft text-primary-hover'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <item.icon
                      className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : 'text-gray-400')}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
