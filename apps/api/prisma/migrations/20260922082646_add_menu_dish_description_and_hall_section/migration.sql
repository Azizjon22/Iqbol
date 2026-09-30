-- AlterEnum
ALTER TYPE "MenuMediaSection" ADD VALUE 'HALL';

-- AlterTable
ALTER TABLE "menu_dishes" ADD COLUMN     "description" TEXT;
