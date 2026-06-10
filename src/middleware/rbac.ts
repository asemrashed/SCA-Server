import type { RequestHandler } from 'express'
import type { Role } from '../shared/enums.js'
import { forbidden, unauthorized } from '../lib/errors.js'

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(unauthorized())
      return
    }
    if (!roles.includes(req.auth.role)) {
      next(forbidden())
      return
    }
    next()
  }
}
