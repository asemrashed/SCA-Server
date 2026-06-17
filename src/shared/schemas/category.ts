import { z } from 'zod'

export const createCategorySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  shortIntro: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
  order: z.number().int().min(0).default(0),
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
})
