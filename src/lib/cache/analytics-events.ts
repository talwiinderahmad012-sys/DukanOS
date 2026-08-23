import 'server-only';

type AnalyticsEventType =
  | 'sale'
  | 'purchase'
  | 'expense'
  | 'payment'
  | 'stock'
  | 'payroll';

export type AnalyticsEvent = {
  type: AnalyticsEventType;
  businessId: string;
  branchId?: string | null;
  timestamp: number;
};

type Subscriber = (event: AnalyticsEvent) => void;

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribeAnalyticsEvents(
  businessId: string,
  subscriber: Subscriber
): () => void {
  let set = subscribers.get(businessId);
  if (!set) {
    set = new Set();
    subscribers.set(businessId, set);
  }
  set.add(subscriber);
  return () => {
    set!.delete(subscriber);
    if (set!.size === 0) {
      subscribers.delete(businessId);
    }
  };
}

export function publishAnalyticsEvent(event: AnalyticsEvent): void {
  const set = subscribers.get(event.businessId);
  if (!set || set.size === 0) return;
  for (const cb of set) {
    try {
      cb(event);
    } catch {
      // ignore subscriber errors
    }
  }
}
