import type { Language } from './types';

/**
 * Exact-match map of server-side (server action / API route) messages that are
 * surfaced in the UI. Keys are the verbatim English strings returned by the
 * server; values are the Urdu translations. English mode displays the original
 * message untouched. Any message not present here falls back to the raw text.
 */
const UR: Record<string, string> = {
  'Not authenticated': 'آپ لاگ اِن نہیں ہیں',
  'Unauthorized': 'آپ کو اجازت نہیں ہے',
  'Business not found': 'کاروبار نہیں ملا',
  'Not found': 'ریکارڈ نہیں ملا',
  'Invalid input': 'غلط اندراج',
  'Invalid credentials': 'ای میل یا پاس ورڈ غلط ہے',
  'Email already registered': 'یہ ای میل پہلے سے رجسٹرڈ ہے',
  'Something went wrong': 'کوئی مسئلہ پیش آ گیا',
  'Please try again': 'براہ کرم دوبارہ کوشش کریں',
};

const EN: Record<string, string> = {};

export const SERVER_MESSAGES: Record<Language, Record<string, string>> = { EN, UR };
