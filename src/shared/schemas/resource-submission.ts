import { z } from 'zod'
import { ResourceCategory, ResourceSubmissionStatus } from '../enums.js'

const idSchema = z.string().min(1)

export const listResourceSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(ResourceSubmissionStatus).optional(),
  category: z.enum([ResourceCategory.EXAM, ResourceCategory.ASSIGNMENT]),
  courseId: idSchema.optional(),
  batchId: idSchema.optional(),
  hasResult: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export const reviewResourceSubmissionSchema = z.object({
  action: z.enum(['accept', 'reject']),
})

export const uploadResourceSubmissionResultSchema = z.object({
  resultFileUrl: z.string().min(1).max(2048),
})

export type ListResourceSubmissionsQuery = z.infer<typeof listResourceSubmissionsQuerySchema>
export type ReviewResourceSubmissionInput = z.infer<typeof reviewResourceSubmissionSchema>
export type UploadResourceSubmissionResultInput = z.infer<
  typeof uploadResourceSubmissionResultSchema
>
