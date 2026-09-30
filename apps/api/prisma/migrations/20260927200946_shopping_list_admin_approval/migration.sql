-- AlterEnum
ALTER TYPE "ShoppingListStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "shopping_list_items" ADD COLUMN     "originalQuantity" DECIMAL(12,3);

-- AlterTable
ALTER TABLE "shopping_lists" ADD COLUMN     "adminSeenAt" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
