import { z } from 'zod'
import { DeliveryMode, LessonType } from '../enums.js'

export const lessonInputSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.nativeEnum(LessonType).default(LessonType.RECORDED),
  videoUrl: z.string().url().optional().nullable(),
  content: z.string().optional().nullable(),
  durationS: z.number().int().positive().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isPreview: z.boolean().default(false),
})

export const moduleInputSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0).default(0),
  lessons: z.array(lessonInputSchema).optional(),
})

export const subjectInputSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0).default(0),
  modules: z.array(moduleInputSchema).optional(),
})

const courseBaseSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  description: z.string().max(5000).optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  priceMinor: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
})

export const createCourseSchema = z.discriminatedUnion('deliveryMode', [
  courseBaseSchema
    .extend({
      deliveryMode: z.literal(DeliveryMode.RECORDED),
      modules: z.array(moduleInputSchema).optional(),
    })
    .strict(),
  courseBaseSchema
    .extend({
      deliveryMode: z.literal(DeliveryMode.LIVE),
      subjects: z.array(subjectInputSchema).optional(),
    })
    .strict(),
])

export const updateCourseSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
      .optional(),
    description: z.string().max(5000).optional().nullable(),
    thumbnail: z.string().url().optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    priceMinor: z.number().int().min(0).optional(),
    isPublished: z.boolean().optional(),
    modules: z.array(moduleInputSchema).optional(),
    subjects: z.array(subjectInputSchema).optional(),
  })
  .refine((data) => !(data.modules && data.subjects), {
    message: 'Provide modules (RECORDED) or subjects (LIVE), not both',
  })

export const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  deliveryMode: z.nativeEnum(DeliveryMode).optional(),
  sort: z.string().optional(),
})

export const createContentGrantSchema = z.object({
  grantingBatchId: z.string().cuid(),
})
