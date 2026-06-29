-- CreateTable
CREATE TABLE "MonthlyPaymentAccessGrant" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT NOT NULL,

    CONSTRAINT "MonthlyPaymentAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyPaymentAccessGrant_billingMonth_idx" ON "MonthlyPaymentAccessGrant"("billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPaymentAccessGrant_enrollmentId_billingMonth_key" ON "MonthlyPaymentAccessGrant"("enrollmentId", "billingMonth");

-- AddForeignKey
ALTER TABLE "MonthlyPaymentAccessGrant" ADD CONSTRAINT "MonthlyPaymentAccessGrant_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPaymentAccessGrant" ADD CONSTRAINT "MonthlyPaymentAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
