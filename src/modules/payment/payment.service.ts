import { prisma } from '../../config/db.js'
import { clientUrl, publicApiBaseUrl } from '../../config/env.js'
import { paymentProvider } from '../../lib/payment/index.js'
import { forbidden, notFound, paymentFailed, validationError } from '../../lib/errors.js'
import {
  EnrollmentStatus,
  PaymentPurpose,
} from '../../shared/enums.js'
import { PaymentStatus } from '@prisma/client'
import type { InitiatePaymentInput } from '../../shared/schemas/payment.js'
import { activateEnrollmentAfterPayment } from '../enrollment/enrollment.service.js'

export interface PaymentInitiateDto {
  paymentId: string
  redirectUrl: string
}

async function resolveEnrollmentPayment(
  userId: string,
  enrollmentId: string,
): Promise<{
  enrollmentId: string
  amountMinor: number
  productName: string
}> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, studentId: userId },
    include: {
      batch: { select: { title: true, priceMinor: true } },
      course: { select: { title: true, priceMinor: true } },
    },
  })

  if (!enrollment) {
    throw notFound('Enrollment not found')
  }

  if (enrollment.status !== EnrollmentStatus.PENDING) {
    throw validationError('Enrollment is not awaiting payment')
  }

  const product = enrollment.batch ?? enrollment.course
  if (!product) {
    throw notFound('Enrollment product not found')
  }

  if (product.priceMinor <= 0) {
    throw validationError('This enrollment does not require payment')
  }

  return {
    enrollmentId: enrollment.id,
    amountMinor: product.priceMinor,
    productName: product.title,
  }
}

export async function initiatePayment(
  userId: string,
  input: InitiatePaymentInput,
): Promise<PaymentInitiateDto> {
  if (input.purpose === PaymentPurpose.ORDER) {
    throw validationError('Shop checkout is not available yet')
  }

  const resolved = await resolveEnrollmentPayment(userId, input.refId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, email: true },
  })
  if (!user) {
    throw notFound('User not found')
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      purpose: PaymentPurpose.ENROLLMENT,
      enrollmentId: resolved.enrollmentId,
      amountMinor: resolved.amountMinor,
      couponCode: input.couponCode ?? null,
      providerRef: crypto.randomUUID().replace(/-/g, '').slice(0, 30),
    },
  })

  const client = clientUrl().replace(/\/$/, '')
  const apiBase = publicApiBaseUrl().replace(/\/$/, '')
  const query = `paymentId=${payment.id}`

  try {
    const session = await paymentProvider.initiate({
      tranId: payment.providerRef,
      amountMinor: payment.amountMinor,
      customerName: user.name,
      customerPhone: user.phone,
      customerEmail: user.email,
      productName: resolved.productName,
      successUrl: `${client}/payments/success?${query}`,
      failUrl: `${client}/payments/fail?${query}`,
      cancelUrl: `${client}/payments/cancel?${query}`,
      ipnUrl: `${apiBase}/api/payments/webhook`,
    })

    return {
      paymentId: payment.id,
      redirectUrl: session.redirectUrl,
    }
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    })
    const message = err instanceof Error ? err.message : 'Payment initiation failed'
    throw paymentFailed(message)
  }
}

export async function handlePaymentWebhook(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const tranId = payload.tran_id
  if (typeof tranId !== 'string' || !tranId) {
    return { ok: false }
  }

  const payment = await prisma.payment.findUnique({
    where: { providerRef: tranId },
    include: { enrollment: true },
  })

  if (!payment) {
    return { ok: false }
  }

  if (payment.status === PaymentStatus.PAID) {
    return { ok: true }
  }

  const verified = await paymentProvider.verifyWebhook({
    providerRef: tranId,
    payload,
  })

  if (verified.cancelled) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CANCELLED },
    })
    return { ok: true }
  }

  if (!verified.success) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    })
    return { ok: true }
  }

  if (
    verified.amountMinor != null &&
    verified.amountMinor !== payment.amountMinor
  ) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    })
    return { ok: false }
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id } })
    if (!current || current.status === PaymentStatus.PAID) {
      return
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        transactionId: verified.transactionId ?? null,
        paidAt: new Date(),
      },
    })

    if (payment.enrollmentId && payment.purpose === PaymentPurpose.ENROLLMENT) {
      await activateEnrollmentAfterPayment(payment.enrollmentId, tx)
    }
  })

  return { ok: true }
}

export async function getPaymentForUser(
  userId: string,
  paymentId: string,
): Promise<{
  id: string
  status: PaymentStatus
  amountMinor: number
  enrollmentId: string | null
}> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      enrollmentId: true,
    },
  })

  if (!payment) {
    throw notFound('Payment not found')
  }

  if (payment.enrollmentId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: payment.enrollmentId, studentId: userId },
      select: { id: true },
    })
    if (!enrollment) {
      throw forbidden('Payment not found')
    }
  }

  return payment
}
