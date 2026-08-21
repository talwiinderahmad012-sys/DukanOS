/**
 * Timezone-aware date interval generators and growth calculation utilities.
 */

export type GrowthResult = {
  current: number;
  previous: number;
  percentage: number | null;
  status: 'UP' | 'DOWN' | 'FLAT' | 'NEW' | 'NO_BASELINE';
  formatted: string;
};

/**
 * Calculates percentage growth safely without NaN or Infinity.
 */
export function calculateGrowth(current: number, previous: number): GrowthResult {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0) {
    if (cur === 0) {
      return {
        current: cur,
        previous: prev,
        percentage: 0,
        status: 'FLAT',
        formatted: '0.0%',
      };
    }
    return {
      current: cur,
      previous: prev,
      percentage: null,
      status: 'NO_BASELINE',
      formatted: '+100% (New)',
    };
  }

  const rawPercent = ((cur - prev) / Math.abs(prev)) * 100;
  const percentage = Math.round(rawPercent * 10) / 10;

  let status: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
  if (percentage > 0.05) status = 'UP';
  else if (percentage < -0.05) status = 'DOWN';

  const sign = percentage > 0 ? '+' : '';
  return {
    current: cur,
    previous: prev,
    percentage,
    status,
    formatted: `${sign}${percentage.toFixed(1)}%`,
  };
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns UTC Date range [start, end] for a given calendar day in the specified timezone.
 */
export function getDailyRange(dateInput?: Date | string, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; dateStr: string } {
  const target = dateInput ? new Date(dateInput) : new Date();
  
  const y = target.getFullYear();
  const m = target.getMonth();
  const d = target.getDate();

  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);

  return {
    start,
    end,
    dateStr: formatDateKey(start),
  };
}

/**
 * Returns UTC Date range [start, end] for a 7-day week containing the given date.
 */
export function getWeeklyRange(dateInput?: Date | string, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; days: { date: Date; dateStr: string; dayName: string }[] } {
  const target = dateInput ? new Date(dateInput) : new Date();
  
  // Calculate Monday of the week
  const dayOfWeek = target.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(target);
  monday.setDate(target.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      date: cur,
      dateStr: formatDateKey(cur),
      dayName: dayNames[i],
    });
  }

  return {
    start: monday,
    end: sunday,
    days,
  };
}

/**
 * Returns UTC Date range [start, end] for a full calendar month.
 */
export function getMonthlyRange(yearInput?: number, monthInput?: number, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; year: number; month: number; daysInMonth: number } {
  const now = new Date();
  const year = yearInput !== undefined ? yearInput : now.getFullYear();
  const month = monthInput !== undefined ? monthInput : now.getMonth() + 1; // 1-indexed (1..12)

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = end.getDate();

  return {
    start,
    end,
    year,
    month,
    daysInMonth,
  };
}

/**
 * Returns UTC Date range [start, end] for a full calendar year.
 */
export function getYearlyRange(yearInput?: number, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; year: number } {
  const now = new Date();
  const year = yearInput !== undefined ? yearInput : now.getFullYear();

  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  return {
    start,
    end,
    year,
  };
}
