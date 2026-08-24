'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DateRangeFilter, type DateRangePreset } from '@/components/analytics/date-range-filter';

export function SalesAnalyticsFilter({
  preset,
  startISO,
  endISO,
}: {
  preset: DateRangePreset;
  startISO: string;
  endISO: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [startDate, setStartDate] = useState(() => new Date(startISO));
  const [endDate, setEndDate] = useState(() => new Date(endISO));

  // Client-side navigation keeps the URL shareable and lets the server
  // component re-render analytics for the selected range without a full
  // browser reload, preserving auth/business context.
  const navigate = (p: string, start: Date, end: Date) => {
    const params = new URLSearchParams();
    params.set('preset', p);
    if (p === 'custom') {
      params.set('start', start.toISOString().split('T')[0]);
      params.set('end', end.toISOString().split('T')[0]);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <DateRangeFilter
      preset={preset}
      startDate={startDate}
      endDate={endDate}
      onPresetChange={(p) => {
        if (p !== 'custom') {
          navigate(p, startDate, endDate);
        }
      }}
      onStartDateChange={(d) => {
        setStartDate(d);
        navigate('custom', d, endDate);
      }}
      onEndDateChange={(d) => {
        setEndDate(d);
        navigate('custom', startDate, d);
      }}
    />
  );
}
