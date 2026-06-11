import { z } from 'zod'
import { LessonType } from '../enums.js'

export const lessonInputSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.nativeEnum(LessonType).default(LessonType.VIDEO),
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

export const createCourseSchema = z.object({
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
  modules: z.array(moduleInputSchema).optional(),
})

export const updateCourseSchema = createCourseSchema.partial()

export const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  sort: z.string().optional(),
})
