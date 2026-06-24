import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().min(1),
  ADMIN_WHATSAPP_PHONE: z.string().min(10).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().default('mock_cloud_name'),
  CLOUDINARY_API_KEY: z.string().default('mock_api_key'),
  CLOUDINARY_API_SECRET: z.string().default('mock_api_secret'),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${issues}`)
  }
  return parsed.data
}

export const env = loadEnv()

/** Comma-separated CORS_ORIGIN — e.g. `https://www.example.com,https://example.com` */
export function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const MOCK_CLOUDINARY_VALUES = new Set(['mock_cloud_name', 'mock_api_key', 'mock_api_secret'])

/** True when real Cloudinary credentials are set (not placeholder mock values). */
export function isCloudinaryConfigured(): boolean {
  return (
    !MOCK_CLOUDINARY_VALUES.has(env.CLOUDINARY_CLOUD_NAME) &&
    !MOCK_CLOUDINARY_VALUES.has(env.CLOUDINARY_API_KEY) &&
    !MOCK_CLOUDINARY_VALUES.has(env.CLOUDINARY_API_SECRET)
  )
}

/** Admin WhatsApp number for manual monthly fee requests (digits only, BD format). */
export function adminWhatsappPhone(): string {
  return env.ADMIN_WHATSAPP_PHONE ?? '01638149875'
}
