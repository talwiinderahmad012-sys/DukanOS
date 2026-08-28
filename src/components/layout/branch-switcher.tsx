'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check, Layers } from 'lucide-react';
import { switchActiveBranchAction } from '@/app/actions/business.actions';
import { useTranslation } from '@/lib/i18n/language-context';

export function BranchSwitcher({
  activeBranch,
  branches,
}: {
  activeBranch: { id: string; name: string; code: string } | null;
  branches: Array<{ id: string; name: string; code: string }>;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!branches || branches.length <= 1) {
    return null; // No need for switcher if single branch
  }

  const handleSelectBranch = async (branchId: string) => {
    setSwitching(true);
    const res = await switchActiveBranchAction(branchId);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    }
    setSwitching(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 transition-colors"
      >
        <div className="flex items-center gap-1.5 truncate">
          {activeBranch ? (
            <>
              <Building2 className="w-3.5 h-3.5 text-gray-900 shrink-0" />
              <span className="truncate">{activeBranch.name}</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{t('ui.allBranches')}</span>
            </>
          )}
        </div>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ms-1" />
      </button>

      {isOpen && (
        <div className="absolute start-0 end-0 top-full mt-1 z-50 bg-white rounded-2xl border border-gray-200 shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 min-w-[180px]">
          <div className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
            {t('ui.selectActiveBranch')}
          </div>

          <button
            type="button"
            onClick={() => handleSelectBranch('all')}
            className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
              !activeBranch
                ? 'bg-purple-50 text-purple-900 font-bold'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('ui.allBranchesAggregated')}</span>
            </div>
            {!activeBranch && <Check className="w-3.5 h-3.5 text-purple-600" />}
          </button>

          {branches.map((b) => {
            const isSelected = activeBranch?.id === b.id;

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBranch(b.id)}
                className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary-soft text-blue-900 font-bold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-gray-900 shrink-0" />
                  <span className="truncate">{b.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-gray-900" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
