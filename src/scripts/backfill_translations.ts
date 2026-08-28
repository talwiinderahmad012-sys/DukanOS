export {};

// Safe backfill for bilingual (English/Urdu) content columns.
//
// Usage:
//   npx tsx src/scripts/backfill_translations.ts            (dry-run, default)
//   npx tsx src/scripts/backfill_translations.ts --apply    (write changes)
//
// Guarantees:
// - READ-ONLY unless --apply is passed.
// - Never overwrites an existing non-empty *_en/*_ur value.
// - Never modifies canonical name/description columns.
// - Never touches financial/identifier fields (SKU, barcode, prices...).
// - Only calls the translation provider when it is configured; otherwise it
//   records the detected-language original into the matching column and
//   leaves the opposite language pending.

require('dotenv').config();

const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...args: unknown[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...args]);
};

type Target = {
  label: 'business' | 'category' | 'product';
  fields: ['name', 'description'];
};

const BATCH_SIZE = 200;
const APPLY = process.argv.includes('--apply');

async function main() {
  const { prisma } = await import('../lib/db/prisma');
  const { resolveBilingualRegeneration, BILINGUAL_MODEL_FIELDS } = await import('../lib/translation/bilingual');
  const { isTranslationConfigured } = await import('../lib/translation/service');

  console.log('--- BILINGUAL BACKFILL ---');
  console.log(`Mode: ${APPLY ? 'APPLY (writes changes)' : 'DRY-RUN (no writes)'}`);
  console.log(`Translation provider configured: ${isTranslationConfigured()}`);

  const targets: { label: Target['label']; repo: any; fields: readonly ('name' | 'description')[] }[] = [
    { label: 'business', repo: prisma.business, fields: BILINGUAL_MODEL_FIELDS.business },
    { label: 'category', repo: prisma.category, fields: BILINGUAL_MODEL_FIELDS.category },
    { label: 'product', repo: prisma.product, fields: BILINGUAL_MODEL_FIELDS.product },
  ];

  const summary: Record<string, { scanned: number; updated: number; pendingTranslation: number }> = {};

  for (const target of targets) {
    let scanned = 0;
    let updated = 0;
    let pendingTranslation = 0;
    let cursor: string | undefined;

    for (;;) {
      const rows = await target.repo.findMany({
        where: {
          OR: [
            { nameEn: null },
            { nameUr: null },
            { descriptionEn: null },
            { descriptionUr: null },
          ],
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
      });
      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id as string;

      for (const row of rows) {
        scanned += 1;
        const { data, failedFields } = await resolveBilingualRegeneration(row, [...target.fields]);
        if (Object.keys(data).length === 0) continue;

        updated += 1;
        if (failedFields.length > 0) pendingTranslation += 1;

        if (APPLY) {
          await target.repo.update({ where: { id: row.id }, data });
        }
      }

      console.log(
        `[${target.label}] scanned=${scanned} would-update/update=${updated} pending-translation=${pendingTranslation}`
      );
    }

    summary[target.label] = { scanned, updated, pendingTranslation };
  }

  console.log('--- SUMMARY ---');
  console.table(summary);
  if (!APPLY) {
    console.log('Dry-run complete. Re-run with --apply to write these changes.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
