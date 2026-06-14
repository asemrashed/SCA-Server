import { z } from 'zod'
import { OrderStatus, ProductType } from '../enums.js'

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case'),
  description: z.string().max(5000).optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  type: z.nativeEnum(ProductType).default(ProductType.BOOK),
  priceMinor: z.number().int().min(0).default(0),
  stock: z.number().int().min(0).optional().nullable(),
  isPublished: z.boolean().default(false),
  digitalUrl: z.string().url().optional().nullable(),
})

export const updateProductSchema = createProductSchema.partial()

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.nativeEnum(ProductType).optional(),
  sort: z.string().optional(),
})

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
})

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1),
})

export const listAdminOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
})

export const reviewOrderSchema = z.object({
  action: z.enum(['confirm', 'cancel']),
})
