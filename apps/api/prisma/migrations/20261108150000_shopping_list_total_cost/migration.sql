-- AlterTable
ALTER TABLE "shopping_lists" ADD COLUMN     "totalCost" DECIMAL(14,2);


-- Lists bought before: their total is what their items added up to.
UPDATE "shopping_lists" l
SET "totalCost" = t.total
FROM (
  SELECT "shoppingListId", SUM(COALESCE("totalCost", "unitPrice" * "quantity", 0)) AS total
  FROM "shopping_list_items"
  WHERE "isPurchased"
  GROUP BY "shoppingListId"
) t
WHERE t."shoppingListId" = l.id AND l.status IN ('PURCHASED', 'CLOSED');
