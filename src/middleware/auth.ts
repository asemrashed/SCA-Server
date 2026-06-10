import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'
import { unauthorized } from '../lib/errors.js'

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized())
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    const payload = verifyAccessToken(token)
    req.auth = { userId: payload.sub, role: payload.role }
    next()
  } catch {
    next(unauthorized('Invalid or expired access token'))
  }
}
