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

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Bounded cache of Intl.DateTimeFormat instances keyed by timezone.
 * Formatter construction is expensive and repeated heavily inside report
 * loops; caching is behavior-preserving because formatters are immutable.
 * Cache is bounded (FIFO eviction) and holds only valid IANA timezones — an
 * invalid timezone still throws RangeError exactly as before, uncached.
 */
const COMPONENTS_FORMATTER_CACHE_MAX = 64;
const componentsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getComponentsFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = componentsFormatterCache.get(timezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  if (componentsFormatterCache.size >= COMPONENTS_FORMATTER_CACHE_MAX) {
    const oldest = componentsFormatterCache.keys().next().value;
    if (oldest !== undefined) componentsFormatterCache.delete(oldest);
  }
  componentsFormatterCache.set(timezone, formatter);
  return formatter;
}

/** Test hook: current number of cached formatters. */
export function getComponentsFormatterCacheSize(): number {
  return componentsFormatterCache.size;
}

function getDateComponentsInTimezone(date: Date, timezone: string) {
  const parts = getComponentsFormatter(timezone).formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * Return the offset in minutes between UTC and the given timezone for the given instant.
 * Positive values mean the timezone is AHEAD of UTC (e.g. Asia/Karachi is +300).
 */
function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const parts = getDateComponentsInTimezone(date, timezone);
  // Wall-clock time treated as UTC — compare with the real instant to get the offset.
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second
  );
  return Math.round((wallAsUtc - date.getTime()) / 60000);
}

/**
 * Build a UTC instant that represents a wall-clock datetime in the given timezone.
 * Example: wall-clock 2026-08-24 00:00 in Asia/Karachi is 2026-08-23T19:00:00Z.
 */
export function dateFromTimezoneParts(y: number, m: number, d: number, h: number, min: number, s: number, timezone: string): Date {
  // First pass: interpret the wall clock as UTC to get a rough instant.
  const probe = new Date(Date.UTC(y, m - 1, d, h, min, s));
  const offsetMin = getTimezoneOffsetMinutes(probe, timezone);
  // Subtract the offset so the probe lands at the correct absolute instant.
  return new Date(probe.getTime() - offsetMin * 60000);
}

export function getDailyRange(dateInput?: Date | string, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; dateStr: string } {
  const target = dateInput ? new Date(dateInput) : new Date();
  const parts = getDateComponentsInTimezone(target, timezone);

  const start = dateFromTimezoneParts(parts.year, parts.month, parts.day, 0, 0, 0, timezone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  const dateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

  return {
    start,
    end,
    dateStr,
  };
}

export function getWeeklyRange(dateInput?: Date | string, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; days: { date: Date; dateStr: string; dayName: string }[] } {
  const target = dateInput ? new Date(dateInput) : new Date();
  const parts = getDateComponentsInTimezone(target, timezone);

  const targetDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  const dayOfWeek = targetDate.getUTCDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayCal = new Date(targetDate);
  mondayCal.setUTCDate(targetDate.getUTCDate() + distanceToMonday);

  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(mondayCal);
    cur.setUTCDate(mondayCal.getUTCDate() + i);
    days.push({
      date: dateFromTimezoneParts(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate(), 0, 0, 0, timezone),
      dateStr: formatDateKeyFromParts(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate()),
      dayName: dayNames[i],
    });
  }

  const start = days[0].date;
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  return {
    start,
    end,
    days,
  };
}

function formatDateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Return the 0-23 wall-clock hour of a given instant in the given timezone.
 */
export function getHourInTimezone(date: Date, timezone: string): number {
  const parts = getDateComponentsInTimezone(date, timezone);
  return parts.hour === 24 ? 0 : parts.hour;
}

export function getMonthlyRange(yearInput?: number, monthInput?: number, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; year: number; month: number; daysInMonth: number } {
  const now = new Date();
  const nowParts = getDateComponentsInTimezone(now, timezone);
  const year = yearInput !== undefined ? yearInput : nowParts.year;
  const month = monthInput !== undefined ? monthInput : nowParts.month;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = dateFromTimezoneParts(year, month, 1, 0, 0, 0, timezone);
  const end = new Date(start.getTime() + daysInMonth * 24 * 60 * 60 * 1000 - 1);

  return {
    start,
    end,
    year,
    month,
    daysInMonth,
  };
}

export function getYearlyRange(yearInput?: number, timezone: string = 'Asia/Karachi'): { start: Date; end: Date; year: number } {
  const now = new Date();
  const nowParts = getDateComponentsInTimezone(now, timezone);
  const year = yearInput !== undefined ? yearInput : nowParts.year;

  const start = dateFromTimezoneParts(year, 1, 1, 0, 0, 0, timezone);
  const end = new Date(dateFromTimezoneParts(year + 1, 1, 1, 0, 0, 0, timezone).getTime() - 1);

  return {
    start,
    end,
    year,
  };
}
