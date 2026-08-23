/**
 * Normalizes Pakistani phone numbers to E.164 (+92) format where practical.
 *
 * Rules (conservative, never blindly modifies international numbers):
 * - "03001234567"        -> "+923001234567"
 * - "3001234567"         -> "+923001234567"  (missing leading 0)
 * - "923001234567"       -> "+923001234567"
 * - "+923001234567"      -> unchanged
 * - "+441234567890"      -> unchanged (non-PK international)
 * - anything unparsable  -> returned as-is (trimmed)
 *
 * Local landline formats (e.g. "042-111-222-333") are left untouched.
 */
export function normalizePkPhone(input?: string | null): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  // Already international and NOT Pakistan -> leave untouched
  if (raw.startsWith('+') && !raw.startsWith('+92')) {
    return raw;
  }

  // Strip separators for analysis (keep leading + if present)
  const digits = raw.replace(/[\s\-().]/g, '');

  // +92xxxxxxxxxx (92 + 10 digits = mobile without leading 0 of subscriber number)
  if (/^\+923\d{9}$/.test(digits)) {
    return digits;
  }

  // 923xxxxxxxxx (no plus) -> add plus
  if (/^923\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  // 03xxxxxxxxx -> +92 + drop leading 0
  if (/^03\d{9}$/.test(digits)) {
    return `+92${digits.slice(1)}`;
  }

  // 3xxxxxxxxx (9 digits after implicit 0) -> +92 + leading 3
  if (/^3\d{9}$/.test(digits)) {
    return `+92${digits}`;
  }

  // Anything else: return trimmed original (do not guess)
  return raw;
}
