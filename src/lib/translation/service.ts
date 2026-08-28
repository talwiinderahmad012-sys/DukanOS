import { detectContentLanguage, isUntranslatableContent, oppositeLanguage } from './detect';
import { HttpTranslationProvider } from './providers/http-provider';
import type {
  ContentLanguage,
  TranslateContentRequest,
  TranslateContentResult,
  TranslationProvider,
} from './types';

let providerOverride: TranslationProvider | null = null;
let cachedProvider: TranslationProvider | null = null;

/** Test seam: inject a provider implementation (e.g. deterministic stubs). */
export function setTranslationProviderForTesting(provider: TranslationProvider | null): void {
  providerOverride = provider;
  cachedProvider = null;
}

function getProvider(): TranslationProvider {
  if (providerOverride) return providerOverride;
  if (!cachedProvider) cachedProvider = new HttpTranslationProvider();
  return cachedProvider;
}

export function isTranslationConfigured(): boolean {
  return getProvider().isConfigured();
}

/**
 * Central entry point for automatic bilingual content generation.
 *
 * Guarantees:
 * - Never throws; every failure collapses to a result with `translation: null`.
 * - Never mutates or retranslates non-textual data (phones, emails, URLs...).
 * - The caller owns the original text; this function only produces the
 *   opposite-language copy.
 */
export async function translateContent(request: TranslateContentRequest): Promise<TranslateContentResult> {
  const text = (request.text ?? '').trim();
  const sourceLanguage = request.sourceLanguage ?? detectContentLanguage(text);
  const targetLanguage = request.targetLanguage ?? oppositeLanguage(sourceLanguage);

  const result: TranslateContentResult = {
    translation: null,
    status: 'failed',
    targetLanguage,
    sourceLanguage,
  };

  if (!text) {
    result.status = 'skipped';
    return result;
  }

  if (isUntranslatableContent(text)) {
    result.translation = text;
    result.status = 'untranslatable';
    return result;
  }

  const provider = getProvider();
  if (!provider.isConfigured()) {
    result.status = 'unconfigured';
    return result;
  }

  const translation = await provider.translate({ text, sourceLanguage, targetLanguage });
  if (translation && translation !== text) {
    result.translation = translation;
    result.status = 'translated';
  } else if (translation) {
    result.translation = translation;
    result.status = 'identical';
  }

  return result;
}

export type { ContentLanguage };
