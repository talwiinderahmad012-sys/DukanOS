import 'server-only';

/**
 * Strips dangerous HTML tags and scripts to prevent Cross-Site Scripting (XSS).
 */
export function sanitizePlainText(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML tags
    .trim();
}

/**
 * Rounds monetary amounts to exactly 2 decimal places to prevent IEEE 754 floating-point errors.
 */
export function roundMoney(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Sanitizes quantity to a safe non-negative integer.
 */
export function sanitizeQuantity(qty: number | string): number {
  const num = typeof qty === 'string' ? parseInt(qty, 10) : Math.floor(qty);
  if (isNaN(num) || num < 0) return 0;
  return num;
}
