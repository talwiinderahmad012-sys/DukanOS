import 'server-only';
import { cookies } from 'next/headers';
import { LANGUAGE_COOKIE_KEY } from '@/lib/i18n/constants';
import { toContentLanguage, type DisplayLanguage } from './localized';
import type { ContentLanguage } from './types';

/**
 * Active display language for the current request, read from the language
 * cookie mirror written by the client LanguageProvider. Server components use
 * this so the first rendered response already shows the correct locale.
 */
export async function getServerContentLanguage(): Promise<ContentLanguage> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value as DisplayLanguage | undefined;
  return toContentLanguage(raw);
}
