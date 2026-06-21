-- CreateEnum
CREATE TYPE "ResourceSubmissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ResourceSubmission" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ResourceSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "resultFileUrl" TEXT,
    "resultPublishedAt" TIMESTAMP(3),

    CONSTRAINT "ResourceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceSubmission_resourceId_idx" ON "ResourceSubmission"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceSubmission_enrollmentId_idx" ON "ResourceSubmission"("enrollmentId");

-- CreateIndex
CREATE INDEX "ResourceSubmission_studentId_idx" ON "ResourceSubmission"("studentId");

-- CreateIndex
CREATE INDEX "ResourceSubmission_status_idx" ON "ResourceSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSubmission_resourceId_enrollmentId_key" ON "ResourceSubmission"("resourceId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
