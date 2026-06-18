-- CreateTable
CREATE TABLE "LiveClassSchedule" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "passcode" TEXT,
    "joinUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveClassSchedule_batchId_idx" ON "LiveClassSchedule"("batchId");

-- AddForeignKey
ALTER TABLE "LiveClassSchedule" ADD CONSTRAINT "LiveClassSchedule_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
