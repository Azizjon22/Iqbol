-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "mustChangePin" BOOLEAN NOT NULL DEFAULT false;
