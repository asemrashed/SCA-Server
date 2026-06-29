import { z } from 'zod'
import { EnrollmentStatus } from '../enums.js'
import { isBdE164Phone, normalizeBdPhone } from '../phone.js'

const billingMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM format')

export const createEnrollmentSchema = z
  .object({
    batchId: z.string().cuid().optional(),
    courseId: z.string().cuid().optional(),
  })
  .refine((data) => Boolean(data.batchId) !== Boolean(data.courseId), {
    message: 'Exactly one of batchId or courseId is required',
  })

export const listAdminEnrollmentsQuerySchema = z.object({
  status: z.nativeEnum(EnrollmentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAdminEnrollmentsQuery = z.infer<typeof listAdminEnrollmentsQuerySchema>

const bdPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeBdPhone)
  .refine(isBdE164Phone, 'Use BD format: +8801XXXXXXXXX or 01XXXXXXXXX')

export const reviewEnrollmentSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    rollNumber: z.string().trim().min(1),
    enrollmentFeeMinor: z.number().int().positive().optional(),
  }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('remove') }),
  z.object({ action: z.literal('block') }),
  z.object({ action: z.literal('unblock') }),
])

export const manualEnrollmentSchema = z
  .object({
    studentId: z.string().cuid().optional(),
    name: z.string().trim().min(1).max(120),
    phone: bdPhoneSchema,
    email: z.string().trim().email().optional().or(z.literal('')),
    rollNumber: z.string().trim().min(1).max(50),
    batchId: z.string().cuid().optional(),
    courseId: z.string().cuid().optional(),
    enrollmentFeeMinor: z.number().int().positive().optional(),
    firstMonthFeeMinor: z.number().int().positive().optional(),
    billingStartMonth: billingMonthSchema.optional(),
  })
  .refine((data) => Boolean(data.batchId) !== Boolean(data.courseId), {
    message: 'Exactly one of batchId or courseId is required',
  })
  .refine((data) => !data.batchId || data.billingStartMonth, {
    message: 'billingStartMonth is required for live batch enrollment',
    path: ['billingStartMonth'],
  })

export const searchEnrollmentStudentsQuerySchema = z.object({
  search: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export type SearchEnrollmentStudentsQuery = z.infer<
  typeof searchEnrollmentStudentsQuerySchema
>
