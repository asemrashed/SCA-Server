import { z } from 'zod'
import { MonthlyPaymentStatus } from '../enums.js'

export const reviewMonthlyPaymentSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    amountMinor: z.number().int().positive(),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('reject'),
    note: z.string().max(500).optional(),
  }),
])

export const listMonthlyPaymentsQuerySchema = z.object({
  status: z.nativeEnum(MonthlyPaymentStatus).optional(),
  courseId: z.string().min(1).optional(),
  batchId: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type ReviewMonthlyPaymentInput = z.infer<typeof reviewMonthlyPaymentSchema>
export type ListMonthlyPaymentsQuery = z.infer<typeof listMonthlyPaymentsQuerySchema>
