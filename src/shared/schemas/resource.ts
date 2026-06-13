import { z } from 'zod'

const fileTypeSchema = z.enum(['pdf', 'slide', 'link'])

export const createResourceSchema = z
  .object({
    title: z.string().min(1).max(200),
    fileUrl: z.string().min(1).max(2048),
    fileType: fileTypeSchema.optional().nullable(),
    batchId: z.string().min(1).optional(),
    courseId: z.string().min(1).optional(),
    moduleId: z.string().min(1).optional().nullable(),
    lessonId: z.string().min(1).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasBatch = Boolean(data.batchId)
    const hasCourse = Boolean(data.courseId)
    if (hasBatch === hasCourse) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one of batchId or courseId is required',
        path: ['batchId'],
      })
    }
    if (hasCourse && !data.moduleId && !data.lessonId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Course resources require moduleId or lessonId',
        path: ['moduleId'],
      })
    }
  })

export const resourceListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    sort: z.string().optional(),
    batchId: z.string().min(1).optional(),
    courseId: z.string().min(1).optional(),
    moduleId: z.string().min(1).optional(),
    lessonId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.batchId && !data.courseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'batchId or courseId is required',
        path: ['batchId'],
      })
    }
    if (data.batchId && data.courseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide batchId or courseId, not both',
        path: ['batchId'],
      })
    }
  })
