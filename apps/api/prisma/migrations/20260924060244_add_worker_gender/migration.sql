-- CreateEnum
CREATE TYPE "WorkerGender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "gender" "WorkerGender";
