-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "workers" ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "events" ADD COLUMN "archivedNotifiedAt" TIMESTAMP(3);

