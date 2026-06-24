import type { CookieOptions, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { parseDurationMs } from '../../lib/duration.js'
import { REFRESH_COOKIE_NAME } from '../../lib/refresh-token.js'

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  }
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions())
}

export function clearRefreshCookie(res: Response): void {
  const { maxAge: _maxAge, ...clearOptions } = refreshCookieOptions()
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions)
}

export function getRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME]
}
