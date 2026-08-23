import { logger } from '@/lib/logging/logger';
import { prisma } from '@/lib/db/prisma';

export const ALLOWED_ANALYTICS_EVENTS = [
  'LANDING_VIEWED',
  'SIGNUP_STARTED',
  'SIGNUP_COMPLETED',
  'BUSINESS_CREATED',
  'ONBOARDING_STARTED',
  'ONBOARDING_COMPLETED',
  'PRODUCT_CREATED',
  'PURCHASE_CREATED',
  'FIRST_SALE_COMPLETED',
  'CUSTOMER_CREATED',
  'CUSTOMER_PAYMENT_RECORDED',
  'REPORT_VIEWED',
  'ADVISOR_VIEWED',
  'EMPLOYEE_MODULE_USED',
  'PWA_INSTALLED',
  'OFFLINE_MODE_USED',
  'OFFLINE_SYNC_COMPLETED',
  'FEEDBACK_SUBMITTED',
  'BUG_REPORT_SUBMITTED',
  'SETTINGS_UPDATED',
  'POS_CHECKOUT_FAILED',
  'OFFLINE_SYNC_CONFLICT',
  'REPORT_QUERY_FAILED',
  'PUSH_SUBSCRIPTION_FAILED',
  'COMMUNICATION_DELIVERY_FAILED',
  'CAMERA_CONNECTION_FAILED',
] as const;

export type AnalyticsEventName = (typeof ALLOWED_ANALYTICS_EVENTS)[number];

export type AnalyticsPayload = {
  eventName: AnalyticsEventName | string;
  userId?: string | null;
  businessId?: string | null;
  appVersion?: string;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN = /password|token|secret|amount|total|paidamount|outstanding|price|purchaseprice|sellingprice|salary|phone|email|body|rtspurl|ipaddress|cookie/i;

/**
 * Strips sensitive financial, personal, and credential fields from analytics metadata.
 */
export function sanitizeAnalyticsMetadata(
  meta?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!meta || typeof meta !== 'object') return {};

  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue; // Exclude sensitive business/personal keys entirely
    }
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      clean[key] = val;
    } else if (val === null) {
      clean[key] = null;
    }
  }
  return clean;
}

/**
 * Privacy-preserving event tracker.
 * Asynchronously persists sanitized events to the database with 100% error isolation.
 */
export async function trackActivationEvent(payload: AnalyticsPayload): Promise<void> {
  try {
    const eventName = payload.eventName as AnalyticsEventName;

    // 1. Validate event allowlist
    if (!ALLOWED_ANALYTICS_EVENTS.includes(eventName)) {
      logger.warn(`[ANALYTICS] Disallowed event rejected: ${payload.eventName}`);
      return;
    }

    const sanitizedMeta = sanitizeAnalyticsMetadata(payload.metadata);
    const appVersion = payload.appVersion || '1.0.0';

    // 2. Structured log output
    logger.info(`[PRODUCT_EVENT] ${eventName}`, {
      eventName,
      userId: payload.userId || undefined,
      businessId: payload.businessId || undefined,
      appVersion,
      metadata: sanitizedMeta,
    });

    // 3. Idempotency check for single-fire lifecycle milestones
    if (payload.businessId && (eventName === 'FIRST_SALE_COMPLETED' || eventName === 'ONBOARDING_COMPLETED')) {
      const existing = await prisma.productAnalyticsEvent.findFirst({
        where: {
          businessId: payload.businessId,
          eventName,
        },
      });
      if (existing) {
        return; // Already recorded for this business
      }
    }

    // 4. Safe Database Ingestion
    await prisma.productAnalyticsEvent.create({
      data: {
        userId: payload.userId || null,
        businessId: payload.businessId || null,
        eventName,
        appVersion,
        metadata: sanitizedMeta as any,
      },
    });
  } catch (err) {
    // Non-critical side effect: telemetry errors must never disrupt financial transactions
    logger.warn('[ANALYTICS] Non-fatal telemetry recording failure', {
      error: (err as Error).message,
    });
  }
}
