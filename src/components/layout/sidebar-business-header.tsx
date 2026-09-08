'use client';

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
  userName,
}: {
  businessName: string;
  role: string;
  userName?: string;
}) {
  const roleLabel = useRoleLabel();
  const displayName = userName || businessName;
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  return (
    <div className="p-3 border-b border-white/40 dark:border-white/10">
      <div className="surface-glass flex items-center gap-3 rounded-2xl p-2.5 shadow-xs transition-colors">
        {/* Avatar wrapped in a gradient ring */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-[2px] bg-gradient-to-tr from-lime-400 via-emerald-400 to-teal-400 shadow-xs">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900 font-bold text-sm text-slate-800 dark:text-slate-100">
            {initial}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-bold text-slate-900 dark:text-white" title={displayName}>
            {displayName}
          </h2>
          <p className="truncate text-[11px] font-semibold capitalize text-emerald-600 dark:text-emerald-400">
            {roleLabel(role)}
          </p>
          {userName && (
            <p className="truncate text-[10px] text-slate-400 dark:text-slate-500 font-medium" title={businessName}>
              {businessName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
