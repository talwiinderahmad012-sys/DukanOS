-- DukaanOS bilingual (English/Urdu) content columns.
--
-- Purely additive migration: nullable columns only. Existing rows are not
-- modified, no data is dropped, and canonical `name`/`description` columns
-- remain the authoritative user-entered values. The `*_en`/`*_ur` columns
-- hold per-language copies managed by the central translation service
-- (src/lib/translation).

ALTER TABLE "Business" ADD COLUMN "name_en" TEXT;
ALTER TABLE "Business" ADD COLUMN "name_ur" TEXT;
ALTER TABLE "Business" ADD COLUMN "description_en" TEXT;
ALTER TABLE "Business" ADD COLUMN "description_ur" TEXT;

ALTER TABLE "Category" ADD COLUMN "name_en" TEXT;
ALTER TABLE "Category" ADD COLUMN "name_ur" TEXT;
ALTER TABLE "Category" ADD COLUMN "description_en" TEXT;
ALTER TABLE "Category" ADD COLUMN "description_ur" TEXT;

ALTER TABLE "Product" ADD COLUMN "name_en" TEXT;
ALTER TABLE "Product" ADD COLUMN "name_ur" TEXT;
ALTER TABLE "Product" ADD COLUMN "description_en" TEXT;
ALTER TABLE "Product" ADD COLUMN "description_ur" TEXT;
