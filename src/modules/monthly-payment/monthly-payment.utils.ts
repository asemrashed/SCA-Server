import { prisma } from '../../config/db.js'
import { MonthlyPaymentStatus } from '../../shared/enums.js'

export const MONTHLY_PAYMENT_DEADLINE_DAY = 20

/** Special billing month key for one-time enrollment fees in MonthlyPayment. */
export const ENROLLMENT_BILLING_MONTH = 'ENROLLMENT'

/** Default first-month fee for live batch manual enrollment (৳1,000). */
export const DEFAULT_FIRST_MONTH_FEE_MINOR = 100_000

export function currentBillingMonth(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function paymentDeadlineForBillingMonth(billingMonth: string): Date {
  const [year, month] = billingMonth.split('-')
  return new Date(
    Number(year),
    Number(month) - 1,
    MONTHLY_PAYMENT_DEADLINE_DAY,
    23,
    59,
    59,
    999,
  )
}

export function paymentDeadlineIso(billingMonth: string): string {
  const [year, month] = billingMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1, MONTHLY_PAYMENT_DEADLINE_DAY)
  return date.toISOString()
}

export function isPastPaymentDeadline(now = new Date(), billingMonth?: string): boolean {
  const month = billingMonth ?? currentBillingMonth(now)
  return now.getTime() > paymentDeadlineForBillingMonth(month).getTime()
}

export async function hasApprovedMonthlyPayment(
  enrollmentId: string,
  billingMonth: string,
): Promise<boolean> {
  const row = await prisma.monthlyPayment.findFirst({
    where: {
      enrollmentId,
      billingMonth,
      status: MonthlyPaymentStatus.APPROVED,
    },
    select: { id: true },
  })
  return !!row
}

export async function hasMonthlyPaymentAccessGrant(
  enrollmentId: string,
  billingMonth: string,
): Promise<boolean> {
  const row = await prisma.monthlyPaymentAccessGrant.findUnique({
    where: {
      enrollmentId_billingMonth: { enrollmentId, billingMonth },
    },
    select: { id: true },
  })
  return !!row
}

/** Batch (LIVE) enrollments lose content access after the 20th without an approved monthly payment. */
export async function isEnrollmentPaymentBlocked(
  enrollmentId: string,
  batchId: string | null,
  now = new Date(),
): Promise<boolean> {
  if (!batchId) return false

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { billingStartMonth: true },
  })

  const billingMonth = currentBillingMonth(now)

  if (enrollment?.billingStartMonth && billingMonth < enrollment.billingStartMonth) {
    return false
  }

  if (!isPastPaymentDeadline(now, billingMonth)) return false

  if (await hasApprovedMonthlyPayment(enrollmentId, billingMonth)) return false
  if (await hasMonthlyPaymentAccessGrant(enrollmentId, billingMonth)) return false

  return true
}
