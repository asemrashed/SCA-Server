import { z } from 'zod'
import { EnrollmentStatus } from '../enums.js'

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
})

export const reviewEnrollmentSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    rollNumber: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.action !== 'approve' || data.rollNumber, {
    message: 'rollNumber is required when approving',
    path: ['rollNumber'],
  })
