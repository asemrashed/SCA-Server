import { z } from 'zod'
import { ReviewStatus } from '../enums.js'

export const createReviewSchema = z.object({
  courseId: z.string().min(1),
  batchId: z.string().min(1).optional(),
  enrollmentId: z.string().min(1).optional(),
  text: z.string().trim().min(10).max(2000),
})

export const moderateReviewSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('activate') }),
  z.object({ action: z.literal('hide') }),
])

export const listAdminReviewsQuerySchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  courseId: z.string().min(1).optional(),
  batchId: z.string().min(1).optional(),
  period: z.enum(['week', 'month', 'all']).default('week'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const listPublicReviewsQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>
export type ListAdminReviewsQuery = z.infer<typeof listAdminReviewsQuerySchema>
export type ListPublicReviewsQuery = z.infer<typeof listPublicReviewsQuerySchema>
