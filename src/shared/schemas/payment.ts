import { z } from 'zod'
import { PaymentPurpose } from '../enums.js'

export const initiatePaymentSchema = z.object({
  purpose: z.nativeEnum(PaymentPurpose),
  refId: z.string().min(1),
  couponCode: z.string().max(50).optional(),
})

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>
