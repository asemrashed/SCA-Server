-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'PDF';

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "batchId" TEXT,
ADD COLUMN "deadlineAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "fileUrl" TEXT,
ADD COLUMN "batchId" TEXT,
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "moduleId" TEXT;

-- CreateIndex
CREATE INDEX "Resource_batchId_idx" ON "Resource"("batchId");

-- CreateIndex
CREATE INDEX "Resource_courseId_batchId_category_idx" ON "Resource"("courseId", "batchId", "category");

-- CreateIndex
CREATE INDEX "Question_batchId_idx" ON "Question"("batchId");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");

-- CreateIndex
CREATE INDEX "Question_moduleId_idx" ON "Question"("moduleId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;
