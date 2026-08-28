'use client';

import { Store } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

const ROLE_KEYS: Record<string, string> = {
  OWNER: 'ui.roleOwner',
  MANAGER: 'ui.roleManager',
  CASHIER: 'ui.roleCashier',
  EMPLOYEE: 'ui.roleEmployee',
};

export function useRoleLabel() {
  const { t } = useTranslation();
  return (role: string) => {
    const key = ROLE_KEYS[role.toUpperCase()];
    return key ? t(key) : role.toLowerCase();
  };
}

export function SidebarBusinessHeader({
  businessName,
  role,
}: {
  businessName: string;
  role: string;
}) {
  const roleLabel = useRoleLabel();

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary" aria-hidden="true">
        <Store className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-gray-900" title={businessName}>
          {businessName}
        </h2>
        <p className="truncate text-xs font-medium capitalize text-muted">
          {roleLabel(role)}
        </p>
      </div>
    </div>
  );
}
