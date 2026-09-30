-- DropForeignKey
ALTER TABLE "event_worker_assignments" DROP CONSTRAINT "event_worker_assignments_workerId_fkey";

-- AddForeignKey
ALTER TABLE "event_worker_assignments" ADD CONSTRAINT "event_worker_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
