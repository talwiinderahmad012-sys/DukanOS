'use client';

import React from 'react';
import { PoweredByHexframe } from '@/components/brand/PoweredByHexframe';

export function SidebarStatusChip() {
  return (
    <div className="p-3 border-t border-white/40 dark:border-white/10 mt-auto space-y-2">
      <div className="surface-glass flex items-center justify-between rounded-xl px-3 py-2 shadow-xs transition-colors">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-200">Online</span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500">v1.0.0</span>
      </div>
      {/* Hexframe attribution — subtle, bottom of sidebar */}
      <div className="flex justify-center">
        <PoweredByHexframe light />
      </div>
    </div>
  );
}
