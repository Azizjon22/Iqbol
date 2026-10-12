-- Fix local /uploads/... paths → full S3 URLs
-- Run once against production DB after migrating from local to S3 storage.
-- Safe to re-run: only touches rows that still have the old /uploads/ prefix.

DO $$
DECLARE
  base TEXT := 'https://t3.storageapi.dev/roomy-room-isg3shja2qfa12';
BEGIN

  -- menu_media."url"
  UPDATE menu_media
  SET "url" = base || substring("url" FROM 9)
  WHERE "url" LIKE '/uploads/%';

  -- menus."coverImageUrl"
  UPDATE menus
  SET "coverImageUrl" = base || substring("coverImageUrl" FROM 9)
  WHERE "coverImageUrl" LIKE '/uploads/%';

  -- workers."photoUrl"
  UPDATE workers
  SET "photoUrl" = base || substring("photoUrl" FROM 9)
  WHERE "photoUrl" LIKE '/uploads/%';

  -- inventory_items."photoUrl"
  UPDATE inventory_items
  SET "photoUrl" = base || substring("photoUrl" FROM 9)
  WHERE "photoUrl" LIKE '/uploads/%';

  -- app_settings."logoUrl"
  UPDATE app_settings
  SET "logoUrl" = base || substring("logoUrl" FROM 9)
  WHERE "logoUrl" LIKE '/uploads/%';

  -- app_settings."heroMediaUrl"
  UPDATE app_settings
  SET "heroMediaUrl" = base || substring("heroMediaUrl" FROM 9)
  WHERE "heroMediaUrl" LIKE '/uploads/%';

  RAISE NOTICE 'S3 URL fix applied.';
END $$;
