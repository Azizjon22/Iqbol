-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('READY', 'PROCESSING', 'FAILED');

-- AlterTable: existing rows are already-served files, so they default to READY.
ALTER TABLE "menu_media" ADD COLUMN "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'READY';

-- AlterTable: null means no hero media is set, distinct from a hero media that's READY.
ALTER TABLE "app_settings" ADD COLUMN "heroMediaStatus" "MediaProcessingStatus";
