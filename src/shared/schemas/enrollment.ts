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
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListAdminEnrollmentsQuery = z.infer<typeof listAdminEnrollmentsQuerySchema>

export const reviewEnrollmentSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    rollNumber: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.action !== 'approve' || data.rollNumber, {
    message: 'rollNumber is required when approving',
    path: ['rollNumber'],
  })

export const manualEnrollmentSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(10).max(20),
    email: z.string().trim().email().optional().or(z.literal('')),
    rollNumber: z.string().trim().min(1).max(50),
    batchId: z.string().cuid().optional(),
    courseId: z.string().cuid().optional(),
  })
  .refine((data) => Boolean(data.batchId) !== Boolean(data.courseId), {
    message: 'Exactly one of batchId or courseId is required',
  })
