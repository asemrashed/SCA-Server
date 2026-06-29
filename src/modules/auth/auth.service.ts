import * as argon2 from 'argon2'
import type { User as PrismaUser } from '@prisma/client'
import { prisma } from '../../config/db.js'
import { env } from '../../config/env.js'
import { addDuration } from '../../lib/duration.js'
import { conflict, forbidden, unauthorized, notFound } from '../../lib/errors.js'
import type { Role } from '../../shared/enums.js'
import { isLoginAllowed } from '../../shared/roles.js'
import { signAccessToken } from '../../lib/jwt.js'
import { generateRefreshToken, hashToken } from '../../lib/refresh-token.js'
import type {
  LoginInput,
  RegisterInput,
  UpdateMeInput,
} from '../../shared/schemas/auth.js'
import type { AuthTokensResponse, User } from '../../shared/types/index.js'
import { toPublicUser } from './auth.mapper.js'

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
}

async function issueSession(user: PrismaUser): Promise<AuthSession> {
  if (!isLoginAllowed(user.role as Role)) {
    throw forbidden('This account type cannot sign in')
  }

  const refreshToken = generateRefreshToken()
  const expiresAt = addDuration(new Date(), env.JWT_REFRESH_EXPIRES_IN)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  })

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role as Role }),
    refreshToken,
  }
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (existing) {
    throw conflict('Phone number is already registered')
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  })
  if (emailTaken) {
    throw conflict('Email is already registered')
  }

  const passwordHash = await argon2.hash(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash,
      phoneVerified: true,
    },
  })

  return issueSession(user)
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (!user || user.deletedAt || !user.isActive) {
    throw unauthorized('Invalid phone or password')
  }

  const valid = await argon2.verify(user.passwordHash, input.password)
  if (!valid) {
    throw unauthorized('Invalid phone or password')
  }

  return issueSession(user)
}

export async function refresh(refreshToken: string): Promise<AuthSession> {
  const tokenHash = hashToken(refreshToken)
  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  if (!stored || stored.user.deletedAt || !stored.user.isActive) {
    throw unauthorized('Invalid or expired refresh token')
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  })

  return issueSession(stored.user)
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return

  const tokenHash = hashToken(refreshToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function getMe(userId: string): Promise<User> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
  })
  if (!user) {
    throw notFound('User not found')
  }
  return toPublicUser(user)
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<User> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  })
  return toPublicUser(user)
}

export function toAuthResponse(session: AuthSession): AuthTokensResponse {
  return {
    user: session.user,
    accessToken: session.accessToken,
  }
}
