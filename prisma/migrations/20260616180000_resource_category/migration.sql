-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('GENERAL', 'LECTURE_SHEET', 'SOLUTION_PDF');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "category" "ResourceCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Resource_courseId_category_idx" ON "Resource"("courseId", "category");
