export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  correlationId?: string;
  userId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  category?: string;
  durationMs?: number;
  [key: string]: unknown;
};

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'secret',
  'token',
  'authorization',
  'encryptedsecrets',
  'rtspurl',
  'apikey',
  'vapidprivatekey',
  'cookie',
  'salary',
  'paymentsecret',
  'cardnumber',
  'cvv',
  'bankaccount',
]);

/**
 * Recursively redacts sensitive keys from log metadata.
 */
export function sanitizeLogMetadata(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogMetadata);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function createCorrelationId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoRef.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: context.correlationId || createCorrelationId(),
    category: context.category || 'APP',
    userId: context.userId || undefined,
    businessId: context.businessId || undefined,
    branchId: context.branchId || undefined,
    durationMs: context.durationMs,
    metadata: sanitizeLogMetadata(context),
  };

  const formatted = JSON.stringify(payload);

  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog('debug', message, context),
  info: (message: string, context?: LogContext) => writeLog('info', message, context),
  warn: (message: string, context?: LogContext) => writeLog('warn', message, context),
  error: (message: string, context?: LogContext) => writeLog('error', message, context),
};
