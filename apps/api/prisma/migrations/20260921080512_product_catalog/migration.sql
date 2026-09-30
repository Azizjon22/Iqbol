-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('VEGETABLE', 'FRUIT', 'MEAT', 'DAIRY', 'GREENS', 'GRAIN', 'OIL', 'SPICE', 'DRINK', 'OTHER');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "productCategory" "ProductCategory";
