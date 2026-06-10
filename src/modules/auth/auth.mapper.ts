import type { User as PrismaUser } from '@prisma/client'
import type { Role } from '../../shared/enums.js'
import type { User } from '../../shared/types/index.js'

export function toPublicUser(user: PrismaUser): User {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    email: user.email,
    role: user.role as Role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  }
}
