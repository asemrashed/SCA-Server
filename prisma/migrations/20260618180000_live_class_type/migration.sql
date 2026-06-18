-- CreateEnum
CREATE TYPE "LiveClassType" AS ENUM ('RECURRING', 'ONE_TIME');

-- AlterTable
ALTER TABLE "LiveClassSchedule" ADD COLUMN "type" "LiveClassType" NOT NULL DEFAULT 'RECURRING';
ALTER TABLE "LiveClassSchedule" ADD COLUMN "scheduledDate" DATE;
ALTER TABLE "LiveClassSchedule" ALTER COLUMN "daysOfWeek" SET DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE INDEX "LiveClassSchedule_scheduledDate_idx" ON "LiveClassSchedule"("scheduledDate");
