'use client';

import Link from 'next/link';
import { ShieldAlert, Receipt, Boxes, User, ShoppingCart } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { hasPermission } from '@/lib/permissions/permissions-core';
import type { MembershipRole } from '@/generated/prisma/client';

/**
 * Accessible unauthorized/forbidden state rendered by server pages when the
 * active membership role lacks the required permission. Actions are computed
 * from the SAME RolePermissionMatrix used by the page guard, so the links
 * shown always point to areas the role is actually allowed to open.
 */
export function ForbiddenView({
  role,
  showFinancialNote = true,
}: {
  role: MembershipRole | string;
  showFinancialNote?: boolean;
}) {
  const { t } = useTranslation();

  const actions: Array<{ href: string; label: string; icon: typeof Receipt }> = [];
  if (hasPermission(role as MembershipRole, 'CREATE_SALE')) {
    actions.push({ href: '/dashboard/pos', label: t('forbidden.goToPos'), icon: ShoppingCart });
  }
  if (hasPermission(role as MembershipRole, 'VIEW_SALES')) {
    actions.push({ href: '/dashboard/sales', label: t('forbidden.goToSales'), icon: Receipt });
  }
  if (hasPermission(role as MembershipRole, 'VIEW_INVENTORY')) {
    actions.push({ href: '/dashboard/inventory', label: t('forbidden.goToInventory'), icon: Boxes });
  }
  actions.push({ href: '/dashboard/me', label: t('forbidden.goToWorkspace'), icon: User });

  return (
    <section
      aria-label={t('forbidden.ariaLabel')}
      role="alert"
      className="min-h-[60vh] flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full text-center space-y-6 bg-surface p-8 rounded-3xl border border-border shadow-sm">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
            {t('forbidden.badge')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{t('forbidden.title')}</h1>
          <p className="text-sm text-gray-500">{t('forbidden.description')}</p>
          {showFinancialNote ? (
            <p className="text-xs text-gray-400">{t('forbidden.financialNote')}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap flex-col sm:flex-row gap-3 pt-2 justify-center">
          {actions.slice(0, 3).map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-xl transition-colors"
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
