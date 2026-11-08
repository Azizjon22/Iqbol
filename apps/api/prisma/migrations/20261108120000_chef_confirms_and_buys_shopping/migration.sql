-- DropForeignKey
ALTER TABLE "event_expenses" DROP CONSTRAINT "event_expenses_createdById_fkey";

-- AlterTable
ALTER TABLE "event_expenses" ADD COLUMN     "shoppingListId" TEXT,
ALTER COLUMN "createdById" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "event_expenses_shoppingListId_key" ON "event_expenses"("shoppingListId");

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

