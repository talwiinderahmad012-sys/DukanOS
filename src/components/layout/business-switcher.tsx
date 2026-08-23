'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, 
  ChevronDown, 
  Check, 
  Plus, 
  Building2, 
  ArrowRightLeft,
  Settings
} from 'lucide-react';
import { switchActiveBusinessAction } from '@/app/actions/business.actions';

export function BusinessSwitcher({
  currentBusiness,
  currentRole,
  userBusinesses,
}: {
  currentBusiness: { id: string; name: string; status: string };
  currentRole: string;
  userBusinesses: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    role: string;
    branchesCount: number;
    isActive: boolean;
  }>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBusiness = async (bizId: string) => {
    if (bizId === currentBusiness.id) {
      setIsOpen(false);
      return;
    }

    setSwitchingId(bizId);
    const res = await switchActiveBusinessAction(bizId);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    }
    setSwitchingId(null);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-gray-100/80 transition-all text-left group border border-transparent hover:border-gray-200"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-gray-900 truncate block">
                {currentBusiness.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                {currentRole}
              </span>
              {currentBusiness.status === 'ARCHIVED' && (
                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                  ARCHIVED
                </span>
              )}
            </div>
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl border border-gray-200 shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 min-w-[240px]">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
            Switch Business ({userBusinesses.length})
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {userBusinesses.map((b) => {
              const isSelected = b.id === currentBusiness.id;
              const isSwitching = switchingId === b.id;

              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleSelectBusiness(b.id)}
                  className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 text-blue-900 font-bold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="overflow-hidden">
                    <span className="text-xs truncate block">{b.name}</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {b.role} • {b.branchesCount} {b.branchesCount === 1 ? 'branch' : 'branches'}
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-1">
            <Link
              href="/dashboard/settings/businesses"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <Settings className="w-3.5 h-3.5 text-gray-400" />
              <span>Manage All Businesses</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
