'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_DEBOUNCE_MS = 2000;

export default function LiveAnalyticsRefresher() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    eventSource = new EventSource('/api/analytics/events');

    eventSource.onmessage = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
      }
      setTimeout(() => {
        eventSource = new EventSource('/api/analytics/events');
      }, 5000);
    };

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [router]);

  return null;
}
