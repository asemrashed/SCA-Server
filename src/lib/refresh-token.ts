import { createHash, randomBytes } from 'node:crypto'

export const REFRESH_COOKIE_NAME = 'refreshToken'

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
