-- Rename the venue brand. Existing rows keep a custom name if it was already changed.
ALTER TABLE "app_settings" ALTER COLUMN "brandName" SET DEFAULT 'Iqbol';

UPDATE "app_settings" SET "brandName" = 'Iqbol' WHERE "brandName" = 'Shodiyora';
