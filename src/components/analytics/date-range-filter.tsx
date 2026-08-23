'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';

export type DateRangePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'lastYear' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

function getRangeForPreset(preset: DateRangePreset, timezone?: string): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today': {
      const start = new Date(y, m, d, 0, 0, 0, 0);
      const end = new Date(y, m, d, 23, 59, 59, 999);
      return { start, end, label: 'Today' };
    }
    case 'yesterday': {
      const start = new Date(y, m, d - 1, 0, 0, 0, 0);
      const end = new Date(y, m, d - 1, 23, 59, 59, 999);
      return { start, end, label: 'Yesterday' };
    }
    case 'thisWeek': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(y, m, d + diff, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'This Week' };
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
      return { start, end, label: 'Last Week' };
    }
    case 'thisMonth': {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    }
    case 'lastMonth': {
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      return { start, end, label: 'Last Month' };
    }
    case 'thisQuarter': {
      const quarterStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, quarterStartMonth, 1, 0, 0, 0, 0);
      const end = new Date(y, quarterStartMonth + 3, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Quarter' };
    }
    case 'thisYear': {
      const start = new Date(y, 0, 1, 0, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return { start, end, label: 'This Year' };
    }
    case 'lastYear': {
      const start = new Date(y - 1, 0, 1, 0, 0, 0, 0);
      const end = new Date(y - 1, 11, 31, 23, 59, 59, 999);
      return { start, end, label: 'Last Year' };
    }
    case 'custom':
    default: {
      return { start: now, end: now, label: 'Custom' };
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
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    onPresetChange(newPreset);
    if (newPreset !== 'custom') {
      const range = getRangeForPreset(newPreset);
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
          { id: 'today', label: 'Today' },
          { id: 'thisWeek', label: 'This Week' },
          { id: 'thisMonth', label: 'This Month' },
          { id: 'lastMonth', label: 'Last Month' },
          { id: 'thisYear', label: 'This Year' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handlePresetChange(tab.id as DateRangePreset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              preset === tab.id
                ? 'bg-white text-blue-600 shadow-xs'
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
            ? 'bg-white text-blue-600 border-blue-200 shadow-xs'
            : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        Custom
      </button>
      {isCustomOpen && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={formatDate(startDate)}
            onChange={(e) => onStartDateChange(new Date(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={formatDate(endDate)}
            onChange={(e) => onEndDateChange(new Date(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}
