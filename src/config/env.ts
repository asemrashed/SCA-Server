import path from 'node:path'
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
  /** Absolute or relative path where uploaded files are stored on disk. */
  UPLOAD_DIR: z.string().default('./uploads'),
  /**
   * Public base URL for uploaded files (no trailing slash).
   * e.g. https://api.sharifcommerceacademy.com/uploads
   */
  PUBLIC_UPLOAD_BASE_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${issues}`)
  }
  const data = parsed.data
  if (data.NODE_ENV === 'production' && !data.PUBLIC_UPLOAD_BASE_URL) {
    throw new Error('Invalid environment: PUBLIC_UPLOAD_BASE_URL is required in production')
  }
  return data
}

export const env = loadEnv()

/** Comma-separated CORS_ORIGIN — e.g. `https://www.example.com,https://example.com` */
export function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

/** Resolved absolute directory for file uploads. */
export function uploadDir(): string {
  return path.isAbsolute(env.UPLOAD_DIR)
    ? env.UPLOAD_DIR
    : path.resolve(process.cwd(), env.UPLOAD_DIR)
}

/** Base URL returned in upload API responses (no trailing slash). */
export function publicUploadBaseUrl(): string {
  if (env.PUBLIC_UPLOAD_BASE_URL) {
    return env.PUBLIC_UPLOAD_BASE_URL.replace(/\/$/, '')
  }
  return `http://localhost:${env.PORT}/uploads`
}

/** Admin WhatsApp number for manual monthly fee requests (digits only, BD format). */
export function adminWhatsappPhone(): string {
  return env.ADMIN_WHATSAPP_PHONE ?? '01638149875'
}
