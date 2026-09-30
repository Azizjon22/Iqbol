-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('DISHWARE', 'PRODUCT');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "category" "InventoryCategory" NOT NULL DEFAULT 'PRODUCT';
