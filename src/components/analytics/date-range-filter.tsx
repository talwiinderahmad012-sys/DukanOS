'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'lastYear' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

function getRangeForPreset(
  preset: DateRangePreset,
  translate: (path: string) => string,
  timezone?: string
): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today': {
      const start = new Date(y, m, d, 0, 0, 0, 0);
      const end = new Date(y, m, d, 23, 59, 59, 999);
      return { start, end, label: translate('common.today') };
    }
    case 'yesterday': {
      const start = new Date(y, m, d - 1, 0, 0, 0, 0);
      const end = new Date(y, m, d - 1, 23, 59, 59, 999);
      return { start, end, label: translate('common.yesterday') };
    }
    case 'thisWeek': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(y, m, d + diff, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: translate('common.thisWeek') };
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
      return { start, end, label: translate('common.lastWeek') };
    }
    case 'thisMonth': {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start, end, label: translate('common.thisMonth') };
    }
    case 'lastMonth': {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      return { start, end, label: translate('common.lastMonth') };
    }
    case 'thisQuarter': {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, quarterStartMonth, 1, 0, 0, 0, 0);
      const end = new Date(y, quarterStartMonth + 3, 0, 23, 59, 59, 999);
      return { start, end, label: translate('charts.thisQuarter') };
    }
    case 'thisYear': {
      const start = new Date(y, 0, 1, 0, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return { start, end, label: translate('common.thisYear') };
    }
    case 'lastYear': {
      const start = new Date(y - 1, 0, 1, 0, 0, 0, 0);
      const end = new Date(y - 1, 11, 31, 23, 59, 59, 999);
      return { start, end, label: translate('charts.lastYear') };
    }
    case 'custom':
    default: {
      return { start: now, end: now, label: translate('charts.custom') };
    }
  }
}

interface DateRangeFilterProps {
  preset: DateRangePreset;
  startDate: Date;
  endDate: Date;
  onPresetChange: (preset: DateRangePreset) => void;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  const { t } = useTranslation();
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    onPresetChange(newPreset);
    if (newPreset !== 'custom') {
      const range = getRangeForPreset(newPreset, t);
      onStartDateChange(range.start);
      onEndDateChange(range.end);
      setIsCustomOpen(false);
    } else {
      setIsCustomOpen(true);
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'today', label: t('common.today') },
          { id: 'thisWeek', label: t('common.thisWeek') },
          { id: 'thisMonth', label: t('common.thisMonth') },
          { id: 'lastMonth', label: t('common.lastMonth') },
          { id: 'thisYear', label: t('common.thisYear') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handlePresetChange(tab.id as DateRangePreset)}
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
      <button
        onClick={() => handlePresetChange('custom')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          preset === 'custom'
            ? 'bg-white text-gray-900 border-blue-200 shadow-xs'
            : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        {t('charts.custom')}
      </button>
      {isCustomOpen && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label={t('common.startDate')}
            value={formatDate(startDate)}
            onChange={(e) => onStartDateChange(new Date(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-gray-400">{t('charts.to')}</span>
          <input
            type="date"
            aria-label={t('common.endDate')}
            value={formatDate(endDate)}
            onChange={(e) => onEndDateChange(new Date(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
