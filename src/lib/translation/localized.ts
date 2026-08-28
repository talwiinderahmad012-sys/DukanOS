import type { ContentLanguage } from './types';

export type DisplayLanguage = ContentLanguage | 'EN' | 'UR';

export function toContentLanguage(language: DisplayLanguage | null | undefined): ContentLanguage {
  if (language === 'ur' || language === 'UR') return 'ur';
  return 'en';
}

/**
 * Central localized-value lookup for bilingual database records.
 *
 * Given a record with `name` / `nameEn` / `nameUr` style columns, returns the
 * value matching the active display language. Falls back to the canonical base
 * field and then the other language so the UI never blanks out when a
 * generated translation is still pending.
 */
export function getLocalizedValue(
  record: Record<string, unknown>,
  field: string,
  language: DisplayLanguage | null | undefined,
): string | null {
  const locale = toContentLanguage(language);
  const other: ContentLanguage = locale === 'ur' ? 'en' : 'ur';

  const localized = record[`${field}${locale === 'ur' ? 'Ur' : 'En'}`];
  if (typeof localized === 'string' && localized.trim().length > 0) return localized;

  const canonical = record[field];
  if (typeof canonical === 'string' && canonical.trim().length > 0) return canonical;

  const fallback = record[`${field}${other === 'ur' ? 'Ur' : 'En'}`];
  if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback;

  return null;
}

/** True when the record is missing its generated secondary-language value. */
export function hasPendingTranslation(
  record: Record<string, unknown>,
  field: string,
): boolean {
  const canonical = record[field];
  if (typeof canonical !== 'string' || canonical.trim().length === 0) return false;
  const en = record[`${field}En`];
  const ur = record[`${field}Ur`];
  const missingEn = typeof en !== 'string' || en.trim().length === 0;
  const missingUr = typeof ur !== 'string' || ur.trim().length === 0;
  return missingEn || missingUr;
}
