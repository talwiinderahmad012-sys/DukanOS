import type { ContentLanguage } from './types';

const URDU_SCRIPT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u061C\u200F\u2067\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_PATTERN = /[A-Za-z]/g;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^(https?:\/\/|www\.)[^\s]+$/i;
const PHONE_OR_NUMERIC_PATTERN = /^[+\d][\d\s\-().]*$/;

export function countUrduCharacters(text: string): number {
  return (text.match(URDU_SCRIPT_PATTERN) ?? []).length;
}

export function countLatinCharacters(text: string): number {
  return (text.match(LATIN_PATTERN) ?? []).length;
}

/**
 * Detect the dominant content language of free-form user input.
 *
 * Urdu (Arabic-script) characters win as soon as they make up at least half
 * of the letter content, so mixed strings like "پاکستان Medical Center" are
 * attributed by their dominant script instead of being misclassified.
 */
export function detectContentLanguage(text: string | null | undefined): ContentLanguage {
  const value = (text ?? '').trim();
  if (!value) return 'en';

  const urdu = countUrduCharacters(value);
  const latin = countLatinCharacters(value);

  if (urdu === 0) return 'en';
  if (latin === 0) return 'ur';
  return urdu >= latin ? 'ur' : 'en';
}

/**
 * True when the value must never be sent to a translation provider:
 * phone numbers, emails, URLs, bare numbers and other non-linguistic data.
 */
export function isUntranslatableContent(text: string | null | undefined): boolean {
  const value = (text ?? '').trim();
  if (!value) return true;

  if (EMAIL_PATTERN.test(value)) return true;
  if (URL_PATTERN.test(value)) return true;
  if (PHONE_OR_NUMERIC_PATTERN.test(value)) return true;

  const hasUrdu = countUrduCharacters(value) > 0;
  const hasLatin = countLatinCharacters(value) > 0;
  return !hasUrdu && !hasLatin;
}

export function oppositeLanguage(language: ContentLanguage): ContentLanguage {
  return language === 'en' ? 'ur' : 'en';
}
