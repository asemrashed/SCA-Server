import { z } from 'zod'
import { BatchStatus } from '../enums.js'

/** Cohort under a live course — curriculum (subjects) lives on the batch. */
export const createBatchSchema = z.object({
  courseId: z.string().cuid(),
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
})

/** Body for POST /courses/:courseId/batches — courseId comes from the URL. */
export const createBatchBodySchema = createBatchSchema.omit({ courseId: true })

export const updateBatchSchema = createBatchSchema.omit({ courseId: true }).partial()

export const batchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(BatchStatus).optional(),
  courseId: z.string().cuid().optional(),
  sort: z.string().optional(),
})
