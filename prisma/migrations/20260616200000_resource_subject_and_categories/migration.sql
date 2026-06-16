-- AlterEnum
ALTER TYPE "ResourceCategory" ADD VALUE IF NOT EXISTS 'NOTICE';
ALTER TYPE "ResourceCategory" ADD VALUE IF NOT EXISTS 'RESULT_SHEET';
ALTER TYPE "ResourceCategory" ADD VALUE IF NOT EXISTS 'EXAM';
ALTER TYPE "ResourceCategory" ADD VALUE IF NOT EXISTS 'ASSIGNMENT';

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "subjectId" TEXT;

-- CreateIndex
CREATE INDEX "Resource_subjectId_idx" ON "Resource"("subjectId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
