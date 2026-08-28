export {};

// Unit tests for the central bilingual translation system (no database).
// Run: npx tsx src/scripts/test_bilingual_translation.ts
//
// Covers: language detection, untranslatable-data protection, provider
// failure safety (original preserved), passthrough behaviour and update
// semantics (changed source regenerates the opposite language, unchanged
// values are left alone).

const { detectContentLanguage, isUntranslatableContent } = require('../lib/translation/detect');
const {
  translateContent,
  setTranslationProviderForTesting,
} = require('../lib/translation/service');
const {
  resolveBilingualCreate,
  resolveBilingualUpdate,
  resolveBilingualRegeneration,
} = require('../lib/translation/bilingual');
const { getLocalizedValue, hasPendingTranslation } = require('../lib/translation/localized');

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

const URDU_NAME = 'پاکستان میڈیکل سنٹر';
const EN_NAME = 'Pakistan Medical Center';

const stubProvider = {
  name: 'stub',
  isConfigured: () => true,
  async translate(request: { text: string; targetLanguage: string }) {
    if (request.text === URDU_NAME && request.targetLanguage === 'en') return EN_NAME;
    if (request.text === EN_NAME && request.targetLanguage === 'ur') return URDU_NAME;
    return `translated(${request.targetLanguage}): ${request.text}`;
  },
};

const failingProvider = {
  name: 'failing',
  isConfigured: () => true,
  async translate() {
    return null;
  },
};

async function run() {
  console.log('--- Language detection ---');
  assert(detectContentLanguage(EN_NAME) === 'en', 'detects English text');
  assert(detectContentLanguage(URDU_NAME) === 'ur', 'detects Urdu text');
  assert(detectContentLanguage('') === 'en', 'empty input defaults to en');
  assert(detectContentLanguage('الرحمان فارمیسی دوائیں Al-Rehman') === 'ur', 'mixed Urdu-dominant text detected as Urdu');
  assert(detectContentLanguage('0300-1234567') === 'en', 'phone number not detected as Urdu');

  console.log('--- Untranslatable data protection ---');
  assert(isUntranslatableContent('0300-1234567') === true, 'phone number is untranslatable');
  assert(isUntranslatableContent('+92 300 1234567') === true, 'international phone is untranslatable');
  assert(isUntranslatableContent('info@example.com') === true, 'email is untranslatable');
  assert(isUntranslatableContent('https://dukaanos.com') === true, 'URL is untranslatable');
  assert(isUntranslatableContent('12345') === true, 'bare number is untranslatable');
  assert(isUntranslatableContent(EN_NAME) === false, 'product name is translatable');
  assert(isUntranslatableContent(URDU_NAME) === false, 'Urdu name is translatable');

  console.log('--- Provider unavailable: original preserved ---');
  setTranslationProviderForTesting(failingProvider);
  const failedTranslation = await translateContent({ text: URDU_NAME, targetLanguage: 'en' });
  assert(failedTranslation.translation === null, 'failed provider returns null translation');
  assert(failedTranslation.status === 'failed', 'failed provider reports failed status');

  const failedCreate = await resolveBilingualCreate(
    { name: URDU_NAME, description: null },
    ['name', 'description']
  );
  assert(failedCreate.data.nameUr === URDU_NAME, 'CREATE keeps Urdu original verbatim when translation fails');
  assert(failedCreate.data.nameEn === null, 'CREATE leaves English column null when translation fails');
  assert(failedCreate.failedFields.includes('name'), 'CREATE reports failed field for retry');

  console.log('--- Unconfigured provider: original preserved ---');
  setTranslationProviderForTesting(null);
  process.env.TRANSLATION_API_URL = '';
  process.env.TRANSLATION_API_KEY = '';
  const unconfigured = await translateContent({ text: EN_NAME, targetLanguage: 'ur' });
  assert(unconfigured.translation === null, 'unconfigured provider returns null');
  assert(unconfigured.status === 'unconfigured', 'unconfigured provider reports status');
  assert(unconfigured.sourceLanguage === 'en', 'source language detected');

  console.log('--- Passthrough for untranslatable content ---');
  setTranslationProviderForTesting(stubProvider);
  const phone = await translateContent({ text: '0300-1234567', targetLanguage: 'ur' });
  assert(phone.translation === '0300-1234567', 'phone number passes through unchanged');
  assert(phone.status === 'untranslatable', 'phone number marked untranslatable');

  console.log('--- CREATE workflow ---');
  const enCreate = await resolveBilingualCreate({ name: EN_NAME, description: null }, ['name', 'description']);
  assert(enCreate.data.nameEn === EN_NAME, 'English input stored as original (nameEn)');
  assert(enCreate.data.nameUr === URDU_NAME, 'Urdu generated automatically (nameUr)');

  const urCreate = await resolveBilingualCreate({ name: URDU_NAME }, ['name']);
  assert(urCreate.data.nameUr === URDU_NAME, 'Urdu input stored verbatim (no corruption)');
  assert(urCreate.data.nameEn === EN_NAME, 'English generated automatically (nameEn)');

  const phoneCreate = await resolveBilingualCreate({ name: '0300-1234567' }, ['name']);
  assert(phoneCreate.data.nameEn === '0300-1234567' && phoneCreate.data.nameUr === '0300-1234567', 'untranslatable value copied to both languages');

  console.log('--- UPDATE workflow ---');
  const existing = {
    name: EN_NAME,
    nameEn: EN_NAME,
    nameUr: URDU_NAME,
    description: null,
    descriptionEn: null,
    descriptionUr: null,
  };

  const unchanged = await resolveBilingualUpdate(existing, { name: EN_NAME }, ['name']);
  assert(Object.keys(unchanged.data).length === 0, 'unchanged value does not trigger the provider');

  const newUrdu = 'پاکستان میڈیکل اینڈ ڈینٹل سنٹر';
  const editUrdu = await resolveBilingualUpdate(existing, { name: newUrdu }, ['name']);
  assert(editUrdu.data.nameUr === newUrdu, 'edited Urdu becomes the new original');
  assert(typeof editUrdu.data.nameEn === 'string' && editUrdu.data.nameEn !== URDU_NAME, 'English regenerated from the new Urdu original');

  const editEnglish = await resolveBilingualUpdate(existing, { name: 'Pakistan Medical & Dental Center' }, ['name']);
  assert(editEnglish.data.nameEn === 'Pakistan Medical & Dental Center', 'edited English becomes the new original');
  assert(editEnglish.data.nameUr !== null, 'Urdu regenerated from the new English original');

  const savedTranslation = await resolveBilingualUpdate(existing, { name: URDU_NAME }, ['name']);
  assert(savedTranslation.data.nameUr === URDU_NAME, 'saving the stored translation promotes it to original');
  assert(savedTranslation.data.nameEn === undefined || savedTranslation.data.nameEn === EN_NAME, 'existing opposite translation not clobbered');

  const missingOther = { name: URDU_NAME, nameUr: URDU_NAME, nameEn: null, description: null };
  const selfHeal = await resolveBilingualUpdate(missingOther, { name: URDU_NAME }, ['name']);
  assert(selfHeal.data.nameEn === EN_NAME, 'unchanged value with missing translation self-heals');

  const clearDescription = await resolveBilingualUpdate(
    { ...existing, description: 'Old', descriptionEn: 'Old', descriptionUr: 'پرانا' },
    { description: '' },
    ['description']
  );
  assert(clearDescription.data.descriptionEn === null && clearDescription.data.descriptionUr === null, 'cleared field clears both languages');

  console.log('--- REGENERATION (retry) ---');
  const regen = await resolveBilingualRegeneration({ name: URDU_NAME, nameEn: null, nameUr: null, description: null }, ['name', 'description']);
  assert(regen.data.nameUr === URDU_NAME, 'regeneration restores detected-language original');
  assert(regen.data.nameEn === EN_NAME, 'regeneration fills missing opposite language');

  const regenNoOverwrite = await resolveBilingualRegeneration(
    { name: URDU_NAME, nameEn: 'Custom manual text', nameUr: URDU_NAME, description: null },
    ['name']
  );
  assert(regenNoOverwrite.data.nameEn === undefined, 'regeneration never overwrites existing translations');

  console.log('--- Localized display helper ---');
  const record = { name: EN_NAME, nameEn: EN_NAME, nameUr: URDU_NAME };
  assert(getLocalizedValue(record, 'name', 'UR') === URDU_NAME, 'locale ur shows Urdu value');
  assert(getLocalizedValue(record, 'name', 'EN') === EN_NAME, 'locale en shows English value');
  assert(getLocalizedValue(record, 'name', 'ur') === URDU_NAME, 'accepts lowercase locale');
  const pendingRecord = { name: URDU_NAME, nameUr: URDU_NAME, nameEn: null };
  assert(getLocalizedValue(pendingRecord, 'name', 'EN') === URDU_NAME, 'pending translation falls back to original (no blank UI)');
  assert(hasPendingTranslation(pendingRecord, 'name') === true, 'pending translation detected');
  assert(hasPendingTranslation(record, 'name') === false, 'complete record not pending');

  console.log('--- Mixed content preservation ---');
  const mixedUr = await resolveBilingualCreate({ name: 'الرحمان فارمیسی Al-Rehman' }, ['name']);
  assert(mixedUr.data.nameUr === 'الرحمان فارمیسی Al-Rehman', 'Urdu-dominant mixed input stored verbatim as original');
  assert(
    typeof mixedUr.data.nameEn === 'string' && mixedUr.data.nameEn.includes('Al-Rehman'),
    'mixed content: brand name preserved in generated English'
  );

  const mixedEn = await resolveBilingualCreate({ name: 'پاکستان Medical Center' }, ['name']);
  assert(mixedEn.data.nameEn === 'پاکستان Medical Center', 'English-dominant mixed input stored verbatim as original');
  assert(mixedEn.data.nameUr !== null, 'Urdu generated for English-dominant mixed input');

  setTranslationProviderForTesting(null);
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
