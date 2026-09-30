-- CreateEnum
CREATE TYPE "EventExpenseCategory" AS ENUM ('SHOPPING', 'CAMERAMAN', 'ARTIST', 'KORTEJ', 'CHEF', 'WAITERS', 'ZAVZAL', 'CARWASH', 'OTHER');

-- CreateTable
CREATE TABLE "event_expenses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "EventExpenseCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_expenses_eventId_idx" ON "event_expenses"("eventId");

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
