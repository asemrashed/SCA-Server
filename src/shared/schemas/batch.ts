import { z } from 'zod'
import { BatchStatus } from '../enums.js'

const batchSlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')

const optionalDateField = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? null : val),
  z.coerce.date().nullable().optional(),
)

const batchFieldsSchema = z.object({
  title: z.string().min(1).max(200),
  slug: batchSlugSchema.optional(),
  status: z.nativeEnum(BatchStatus),
  priceMinor: z.number().int().min(0),
  capacity: z.number().int().positive().optional().nullable(),
  registrationDeadline: optionalDateField,
  startDate: optionalDateField,
  endDate: optionalDateField,
  thumbnail: z.string().url().optional().nullable(),
  instructorIds: z.array(z.string().cuid()).optional(),
})

/** Cohort under a live course — curriculum (subjects) lives on the batch. */
export const createBatchSchema = batchFieldsSchema.extend({
  courseId: z.string().cuid(),
  status: z.nativeEnum(BatchStatus).default(BatchStatus.DRAFT),
  priceMinor: z.number().int().min(0).default(0),
})

/** Body for POST /courses/:courseId/batches — courseId comes from the URL. */
export const createBatchBodySchema = createBatchSchema.omit({ courseId: true })

/** Partial update — no field defaults so omitted keys are not overwritten. */
export const updateBatchSchema = batchFieldsSchema.partial().extend({
  slug: batchSlugSchema.optional(),
})

export const batchListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(BatchStatus).optional(),
  courseId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  sort: z.string().optional(),
})
