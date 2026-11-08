-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('READY', 'PROCESSING', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MenuMediaSection" ADD VALUE 'FOOD';
ALTER TYPE "MenuMediaSection" ADD VALUE 'ARTIST';

-- AlterEnum
ALTER TYPE "EventExpenseCategory" ADD VALUE 'STOCK';

-- DropForeignKey
ALTER TABLE "inventory_transactions" DROP CONSTRAINT "inventory_transactions_createdById_fkey";

-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "menu_media" ADD COLUMN     "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'READY';

-- AlterTable
ALTER TABLE "inventory_transactions" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shopping_lists" ADD COLUMN     "telegramMessages" JSONB;

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "heroMediaStatus" "MediaProcessingStatus";

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_usages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "telegramMessages" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_usage_items" (
    "id" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "totalCost" DECIMAL(14,2),
    "allocations" JSONB NOT NULL,

    CONSTRAINT "stock_usage_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_lots_itemId_createdAt_idx" ON "inventory_lots"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_usages_eventId_idx" ON "stock_usages"("eventId");

-- CreateIndex
CREATE INDEX "stock_usage_items_usageId_idx" ON "stock_usage_items"("usageId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_telegramChatId_key" ON "staff_users"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "workers_telegramChatId_key" ON "workers"("telegramChatId");

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usages" ADD CONSTRAINT "stock_usages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usages" ADD CONSTRAINT "stock_usages_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usage_items" ADD CONSTRAINT "stock_usage_items_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "stock_usages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_usage_items" ADD CONSTRAINT "stock_usage_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Stock already in the store becomes one unpriced lot per item, so the
-- lot totals match the item quantities from the start.
INSERT INTO "inventory_lots" ("id", "itemId", "quantity", "unitPrice", "createdAt")
SELECT 'lot_' || "id", "id", "quantity", NULL, "createdAt"
FROM "inventory_items"
WHERE "quantity" > 0;
