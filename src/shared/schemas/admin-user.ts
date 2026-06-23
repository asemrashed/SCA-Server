import { z } from 'zod'
import { Role } from '../enums.js'

const e164Phone = z
  .string()
  .trim()
  .regex(/^\+8801[3-9]\d{8}$/, 'Use BD format: +8801XXXXXXXXX')

export const listAdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  sort: z.string().optional(),
})

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: e164Phone,
  password: z.string().trim().min(8).max(128),
  email: z.string().email().optional().nullable(),
  role: z.enum([Role.ADMIN, Role.STUDENT]),
})

export const updateAdminUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional().nullable(),
    role: z.enum([Role.ADMIN, Role.STUDENT]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
