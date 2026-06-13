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
  CLIENT_URL: z.string().url().optional(),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  SSLCOMMERZ_STORE_ID: z.string().default('testbox'),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default('qwerty'),
  SSLCOMMERZ_SANDBOX: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
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

const MOCK_CLOUDINARY_VALUES = new Set(['mock_cloud_name', 'mock_api_key', 'mock_api_secret'])

/** True when real Cloudinary credentials are set (not placeholder mock values). */
export function isCloudinaryConfigured(): boolean {
  return (
    !MOCK_CLOUDINARY_VALUES.has(env.CLOUDINARY_CLOUD_NAME) &&
    !MOCK_CLOUDINARY_VALUES.has(env.CLOUDINARY_API_KEY) &&
    !MOCK_CLOUDINARY_VALUES.has(env.CLOUDINARY_API_SECRET)
  )
}

/** Client origin for payment redirect URLs (success/fail/cancel). */
export function clientUrl(): string {
  return env.CLIENT_URL ?? env.CORS_ORIGIN
}

/** Public base URL for SSLCommerz IPN — use ngrok HTTPS origin in local dev. */
export function publicApiBaseUrl(): string {
  return env.PUBLIC_API_BASE_URL ?? `http://localhost:${env.PORT}`
}

export function sslcommerzApiBase(): string {
  return env.SSLCOMMERZ_SANDBOX
    ? 'https://sandbox.sslcommerz.com'
    : 'https://securepay.sslcommerz.com'
}
