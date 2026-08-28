'use client';

import { detectContentLanguage, isUntranslatableContent } from '@/lib/translation/detect';
import { useTranslation } from '@/lib/i18n/language-context';

/**
 * Non-intrusive form hint explaining that the opposite-language version of
 * the entered content is generated automatically on the server. Mirrors the
 * language detection used by the central translation service so users see
 * which language will be stored as their original input.
 */
export function AutoTranslationHint({ value }: { value: string }) {
  const { t } = useTranslation();

  const trimmed = value.trim();
  if (!trimmed) {
    return <>{t('common.translationAutoGeneric')}</>;
  }

  if (isUntranslatableContent(trimmed)) {
    return <>{t('common.translationAutoNone')}</>;
  }

  return detectContentLanguage(trimmed) === 'ur'
    ? <>{t('common.translationAutoEnglish')}</>
    : <>{t('common.translationAutoUrdu')}</>;
}
