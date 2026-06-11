import { z } from 'zod'
import { BatchStatus } from '../enums.js'
import { lessonInputSchema, moduleInputSchema } from './course.js'

export const subjectInputSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0).default(0),
  modules: z.array(moduleInputSchema).optional(),
})

export const createBatchSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  status: z.nativeEnum(BatchStatus).default(BatchStatus.DRAFT),
  priceMinor: z.number().int().min(0).default(0),
  capacity: z.number().int().positive().optional().nullable(),
  registrationDeadline: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  instructorIds: z.array(z.string().cuid()).optional(),
  subjects: z.array(subjectInputSchema).optional(),
})

export const updateBatchSchema = createBatchSchema.partial()

export const batchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(BatchStatus).optional(),
  sort: z.string().optional(),
})
