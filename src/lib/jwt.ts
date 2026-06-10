import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { Role } from '../shared/enums.js'

export interface AccessTokenPayload {
  sub: string
  role: Role
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
  if (typeof decoded === 'string' || !decoded.sub || !decoded.role) {
    throw new Error('Invalid access token payload')
  }
  return { sub: decoded.sub, role: decoded.role as Role }
}
