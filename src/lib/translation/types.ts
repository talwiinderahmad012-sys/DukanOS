export type ContentLanguage = 'en' | 'ur';

export type TranslationStatus =
  | 'translated'
  | 'identical'
  | 'untranslatable'
  | 'skipped'
  | 'unconfigured'
  | 'failed';

export interface TranslateContentRequest {
  text: string;
  targetLanguage: ContentLanguage;
  sourceLanguage?: ContentLanguage;
}

export interface TranslateContentResult {
  translation: string | null;
  status: TranslationStatus;
  targetLanguage: ContentLanguage;
  sourceLanguage: ContentLanguage;
}

export interface TranslationProvider {
  readonly name: string;
  isConfigured(): boolean;
  translate(request: TranslateContentRequest): Promise<string | null>;
}

export interface BilingualResolution {
  en: string | null;
  ur: string | null;
  sourceLanguage: ContentLanguage;
  failedFields: string[];
}
