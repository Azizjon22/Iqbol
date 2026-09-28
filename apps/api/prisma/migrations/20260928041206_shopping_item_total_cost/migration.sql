-- AlterTable
ALTER TABLE "shopping_list_items" ADD COLUMN     "totalCost" DECIMAL(14,2);

-- Backfill lines bought before this column existed.
UPDATE "shopping_list_items"
SET "totalCost" = ROUND("unitPrice" * "quantity", 2)
WHERE "isPurchased" = true AND "unitPrice" IS NOT NULL AND "totalCost" IS NULL;
