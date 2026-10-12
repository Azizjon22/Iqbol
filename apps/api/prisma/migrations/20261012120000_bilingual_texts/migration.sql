-- Optional Russian copies of free text. Uzbek stays in the original columns.
ALTER TABLE "menus" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "menus" ADD COLUMN "descriptionRu" TEXT;

ALTER TABLE "menu_dishes" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "menu_dishes" ADD COLUMN "descriptionRu" TEXT;

ALTER TABLE "menu_media" ADD COLUMN "captionRu" TEXT;

ALTER TABLE "events" ADD COLUMN "clientNameRu" TEXT;
ALTER TABLE "events" ADD COLUMN "firstDishRu" TEXT;
ALTER TABLE "events" ADD COLUMN "secondDishRu" TEXT;
ALTER TABLE "events" ADD COLUMN "notesRu" TEXT;

ALTER TABLE "inventory_items" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "inventory_transactions" ADD COLUMN "noteRu" TEXT;

ALTER TABLE "shopping_list_items" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "shopping_list_items" ADD COLUMN "noteRu" TEXT;

ALTER TABLE "payments" ADD COLUMN "noteRu" TEXT;
ALTER TABLE "event_expenses" ADD COLUMN "noteRu" TEXT;

ALTER TABLE "app_settings" ADD COLUMN "brandNameRu" TEXT;
