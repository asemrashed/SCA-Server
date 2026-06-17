-- CreateEnum
CREATE TYPE "MonthlyPaymentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "MonthlyPayment" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "amountMinor" INTEGER,
    "status" "MonthlyPaymentStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "MonthlyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyPayment_studentId_idx" ON "MonthlyPayment"("studentId");

-- CreateIndex
CREATE INDEX "MonthlyPayment_status_idx" ON "MonthlyPayment"("status");

-- CreateIndex
CREATE INDEX "MonthlyPayment_billingMonth_idx" ON "MonthlyPayment"("billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPayment_enrollmentId_billingMonth_key" ON "MonthlyPayment"("enrollmentId", "billingMonth");

-- AddForeignKey
ALTER TABLE "MonthlyPayment" ADD CONSTRAINT "MonthlyPayment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayment" ADD CONSTRAINT "MonthlyPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPayment" ADD CONSTRAINT "MonthlyPayment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
