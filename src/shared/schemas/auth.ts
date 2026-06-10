import { z } from 'zod'

const e164Phone = z
  .string()
  .regex(/^\+8801[3-9]\d{8}$/, 'Phone must be E.164 Bangladesh format (+8801XXXXXXXXX)')

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: e164Phone,
  password: z.string().min(8).max(128),
})

export const loginSchema = z.object({
  phone: e164Phone,
  password: z.string().min(1),
})

export const requestPasswordResetSchema = z.object({
  phone: e164Phone,
})

export const resetPasswordSchema = z.object({
  phone: e164Phone,
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(128),
})

export const verifyPhoneSchema = z.object({
  phone: e164Phone,
  otp: z.string().length(6),
})

export const updateMeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateMeInput = z.infer<typeof updateMeSchema>
