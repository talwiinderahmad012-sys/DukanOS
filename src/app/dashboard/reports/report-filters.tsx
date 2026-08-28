'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { CalendarIcon, Receipt, TrendingUp, Truck, Package, FileText, Users, BarChart3, UserCheck, Briefcase } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'lastYear' | 'custom';

interface ReportFiltersProps {
  businessId: string;
  branches: { id: string; name: string }[];
}

function getRangeForPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today': {
      const start = new Date(y, m, d, 0, 0, 0, 0);
      const end = new Date(y, m, d, 23, 59, 59, 999);
      return { start, end };
    }
    case 'yesterday': {
      const start = new Date(y, m, d - 1, 0, 0, 0, 0);
      const end = new Date(y, m, d - 1, 23, 59, 59, 999);
      return { start, end };
    }
    case 'thisWeek': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(y, m, d + diff, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'lastWeek': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const thisWeekStart = new Date(y, m, d + diff, 0, 0, 0, 0);
      const start = new Date(thisWeekStart);
      start.setDate(thisWeekStart.getDate() - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'thisMonth': {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'lastMonth': {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'thisQuarter': {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, quarterStartMonth, 1, 0, 0, 0, 0);
      const end = new Date(y, quarterStartMonth + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'thisYear': {
      const start = new Date(y, 0, 1, 0, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case 'lastYear': {
      const start = new Date(y - 1, 0, 1, 0, 0, 0, 0);
      const end = new Date(y - 1, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case 'custom':
    default: {
      const start = new Date(y, m, d, 0, 0, 0, 0);
      const end = new Date(y, m, d, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

export default function ReportFilters({ businessId, branches }: ReportFiltersProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const preset = (searchParams.get('preset') as DateRangePreset) || 'thisMonth';
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const branchParam = searchParams.get('branchId') || '';

  const range = useMemo(() => getRangeForPreset(preset), [preset]);

  const from = fromParam || range.start.toISOString().split('T')[0];
  const to = toParam || range.end.toISOString().split('T')[0];

  const buildHref = (type: string) => {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('from', from);
    params.set('to', to);
    if (branchParam) params.set('branchId', branchParam);
    return `/dashboard/reports/report?${params.toString()}`;
  };

  const handlePresetChange = (newPreset: DateRangePreset) => {
    const r = getRangeForPreset(newPreset);
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', newPreset);
    params.set('from', r.start.toISOString().split('T')[0]);
    params.set('to', r.end.toISOString().split('T')[0]);
    router.push(`/dashboard/reports?${params.toString()}`);
  };

  const presetTabs: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: t('common.today') },
    { id: 'thisWeek', label: t('common.thisWeek') },
    { id: 'thisMonth', label: t('common.thisMonth') },
    { id: 'lastMonth', label: t('common.lastMonth') },
    { id: 'thisYear', label: t('common.thisYear') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
        {presetTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handlePresetChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              preset === tab.id
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <select
        value={branchParam}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set('branchId', e.target.value);
          else params.delete('branchId');
          router.push(`/dashboard/reports?${params.toString()}`);
        }}
        aria-label={t('reports.allBranches')}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
      >
        <option value="">{t('reports.allBranches')}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
        <CalendarIcon className="w-3.5 h-3.5" />
        <span>{from}</span>
        <span className="text-gray-400">{t('reports.dateTo')}</span>
        <span>{to}</span>
      </div>

      <div className="flex items-center gap-1">
        {REPORT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <a
              key={cat.type}
              href={buildHref(cat.type)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${cat.color}`}
              title={t(cat.titleKey)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t(cat.shortKey)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

const REPORT_CATEGORIES = [
  { type: 'SALES', titleKey: 'reports.salesReport', shortKey: 'reports.salesReportShort', icon: Receipt, color: 'bg-primary-soft text-gray-900 border-blue-100' },
  { type: 'PROFIT', titleKey: 'reports.profitReport', shortKey: 'reports.profitReportShort', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { type: 'PURCHASES', titleKey: 'reports.purchaseReport', shortKey: 'reports.purchaseReportShort', icon: Truck, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { type: 'INVENTORY', titleKey: 'reports.inventoryReport', shortKey: 'reports.inventoryReportShort', icon: Package, color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { type: 'EXPENSES', titleKey: 'reports.expenseReport', shortKey: 'reports.expenseReportShort', icon: FileText, color: 'bg-red-50 text-red-600 border-red-100' },
  { type: 'CUSTOMERS', titleKey: 'reports.customersReport', shortKey: 'reports.customersReportShort', icon: Users, color: 'bg-teal-50 text-teal-600 border-teal-100' },
  { type: 'BRANCHES', titleKey: 'reports.branchesReport', shortKey: 'reports.branchesReportShort', icon: BarChart3, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { type: 'PAYROLL', titleKey: 'reports.payrollReport', shortKey: 'reports.payrollReportShort', icon: UserCheck, color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { type: 'BUSINESS_GROWTH', titleKey: 'reports.growthReport', shortKey: 'reports.growthReportShort', icon: Briefcase, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
];
