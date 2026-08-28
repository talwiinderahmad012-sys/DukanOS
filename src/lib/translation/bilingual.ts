import { detectContentLanguage, isUntranslatableContent, oppositeLanguage } from './detect';
import { translateContent } from './service';
import type { ContentLanguage } from './types';

export type BilingualFieldName = 'name' | 'description';

export const BILINGUAL_MODEL_FIELDS = {
  business: ['name', 'description'],
  category: ['name', 'description'],
  product: ['name', 'description'],
} as const satisfies Record<string, readonly BilingualFieldName[]>;

export type BilingualModel = keyof typeof BILINGUAL_MODEL_FIELDS;

type ColumnData = Record<string, string | null>;

interface BilingualOutcome {
  data: ColumnData;
  failedFields: string[];
}

export function bilingualColumn(field: BilingualFieldName, language: ContentLanguage): string {
  return `${field}${language === 'en' ? 'En' : 'Ur'}`;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function detectSourceLanguage(value: string, override?: ContentLanguage): ContentLanguage {
  return override ?? detectContentLanguage(value);
}

async function generateOpposite(
  value: string,
  sourceLanguage: ContentLanguage,
): Promise<string | null> {
  if (isUntranslatableContent(value)) return value;
  const result = await translateContent({
    text: value,
    sourceLanguage,
    targetLanguage: oppositeLanguage(sourceLanguage),
  });
  return result.translation;
}

/**
 * Build the bilingual column data for a CREATE operation.
 *
 * The caller's original value is written verbatim into the column matching its
 * detected language; the opposite language is generated automatically. The
 * canonical base field (e.g. `name`) is left untouched by this helper.
 * Translation failures never throw — the opposite column stays null and the
 * field is reported in `failedFields` so it can be retried later.
 */
export async function resolveBilingualCreate(
  input: Record<string, unknown>,
  fields: readonly BilingualFieldName[],
  options?: { sourceLanguage?: ContentLanguage },
): Promise<BilingualOutcome> {
  const data: ColumnData = {};
  const failedFields: string[] = [];

  for (const field of fields) {
    const value = asString(input[field]);
    if (!value) continue;

    const sourceLanguage = detectSourceLanguage(value, options?.sourceLanguage);
    data[bilingualColumn(field, sourceLanguage)] = value;

    const otherLanguage = oppositeLanguage(sourceLanguage);
    const translated = await generateOpposite(value, sourceLanguage);
    if (translated !== null) {
      data[bilingualColumn(field, otherLanguage)] = translated;
    } else {
      data[bilingualColumn(field, otherLanguage)] = null;
      failedFields.push(field);
    }
  }

  return { data, failedFields };
}

/**
 * Build the bilingual column data for an UPDATE operation.
 *
 * Rules:
 * - If the user did not change the canonical value and the opposite-language
 *   translation already exists, nothing is re-translated (performance).
 * - If the canonical value changed, it becomes the new original and the
 *   opposite language is regenerated. A failed regeneration nulls the stale
 *   translation instead of keeping misleading text.
 * - Clearing an optional field (empty string/null) clears both languages.
 */
export async function resolveBilingualUpdate(
  existing: Record<string, unknown>,
  input: Record<string, unknown>,
  fields: readonly BilingualFieldName[],
  options?: { sourceLanguage?: ContentLanguage },
): Promise<BilingualOutcome> {
  const data: ColumnData = {};
  const failedFields: string[] = [];

  for (const field of fields) {
    if (!(field in input)) continue;
    // `undefined` means "field not provided in this update" — never touch
    // the stored translations for it. Only an explicit empty/null clears.
    if (input[field] === undefined) continue;

    const newValue = asString(input[field]);
    const existingValue = asString(existing[field]);
    const enColumn = bilingualColumn(field, 'en');
    const urColumn = bilingualColumn(field, 'ur');

    if (!newValue) {
      if (existingValue !== null) {
        data[enColumn] = null;
        data[urColumn] = null;
      }
      continue;
    }

    if (newValue === existingValue) {
      const sourceLanguage = detectSourceLanguage(newValue, options?.sourceLanguage);
      const otherColumn = bilingualColumn(field, oppositeLanguage(sourceLanguage));
      if (asString(existing[otherColumn]) !== null) continue;

      const translated = await generateOpposite(newValue, sourceLanguage);
      if (translated !== null) {
        data[otherColumn] = translated;
      } else {
        failedFields.push(field);
      }
      continue;
    }

    // The submitted value matches one of the already-stored translations
    // (e.g. the user opened the form in the other language and saved without
    // edits). Promote it to the original without re-translating: the stored
    // opposite-language copy is still a valid translation of this content.
    if (newValue === asString(existing[enColumn]) || newValue === asString(existing[urColumn])) {
      const sourceLanguage = detectSourceLanguage(newValue, options?.sourceLanguage);
      const otherColumn = bilingualColumn(field, oppositeLanguage(sourceLanguage));
      if (asString(existing[otherColumn]) === null) {
        const translated = await generateOpposite(newValue, sourceLanguage);
        if (translated !== null) {
          data[otherColumn] = translated;
        } else {
          failedFields.push(field);
        }
      }
      data[bilingualColumn(field, sourceLanguage)] = newValue;
      continue;
    }

    const sourceLanguage = detectSourceLanguage(newValue, options?.sourceLanguage);
    data[bilingualColumn(field, sourceLanguage)] = newValue;

    const translated = await generateOpposite(newValue, sourceLanguage);
    if (translated !== null) {
      data[bilingualColumn(field, oppositeLanguage(sourceLanguage))] = translated;
    } else {
      data[bilingualColumn(field, oppositeLanguage(sourceLanguage))] = null;
      failedFields.push(field);
    }
  }

  return { data, failedFields };
}

/**
 * Regenerate missing translations for an existing record (retry/backfill).
 * Never overwrites a column that already holds a value.
 */
export async function resolveBilingualRegeneration(
  record: Record<string, unknown>,
  fields: readonly BilingualFieldName[],
): Promise<BilingualOutcome> {
  const data: ColumnData = {};
  const failedFields: string[] = [];

  for (const field of fields) {
    const canonical = asString(record[field]);
    if (!canonical) continue;

    const sourceLanguage = detectSourceLanguage(canonical);
    const sourceColumn = bilingualColumn(field, sourceLanguage);
    const otherColumn = bilingualColumn(field, oppositeLanguage(sourceLanguage));

    if (asString(record[sourceColumn]) === null) {
      data[sourceColumn] = canonical;
    }
    if (asString(record[otherColumn]) !== null) continue;

    const translated = await generateOpposite(canonical, sourceLanguage);
    if (translated !== null) {
      data[otherColumn] = translated;
    } else {
      failedFields.push(field);
    }
  }

  return { data, failedFields };
}
