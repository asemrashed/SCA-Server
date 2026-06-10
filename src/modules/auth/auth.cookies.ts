import type { CookieOptions, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { parseDurationMs } from '../../lib/duration.js'
import { REFRESH_COOKIE_NAME } from '../../lib/refresh-token.js'

export function setRefreshCookie(res: Response, refreshToken: string): void {
  const options: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  }
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, options)
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' })
}

export function getRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME]
}
