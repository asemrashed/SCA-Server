import type { Prisma } from '@prisma/client'
import type { User as PrismaUser } from '@prisma/client'
import type { z } from 'zod'
import * as argon2 from 'argon2'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound } from '../../lib/errors.js'
import { Role } from '../../shared/enums.js'
import type {
  createAdminUserSchema,
  listAdminUsersQuerySchema,
  updateAdminUserSchema,
} from '../../shared/schemas/admin-user.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import { toPublicUser } from '../auth/auth.mapper.js'
import type { User } from '../../shared/types/index.js'

type ListQuery = z.infer<typeof listAdminUsersQuerySchema>
type CreateInput = z.infer<typeof createAdminUserSchema>
type UpdateInput = z.infer<typeof updateAdminUserSchema>

export interface AdminUserListItem extends User {
  isActive: boolean
}

function parseSort(sort?: string): Prisma.UserOrderByWithRelationInput {
  if (!sort) return { createdAt: 'desc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['createdAt', 'name', 'phone', 'role'])
  if (!allowed.has(field)) return { createdAt: 'desc' }
  return { [field]: dir === 'asc' ? 'asc' : 'desc' }
}

function toAdminUserListItem(user: PrismaUser): AdminUserListItem {
  return {
    ...toPublicUser(user),
    isActive: user.isActive,
  }
}

export async function listAdminUsers(
  query: ListQuery,
): Promise<ApiListResponse<AdminUserListItem>> {
  const { page, pageSize, search, role, sort } = query
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: role ?? { in: [Role.ADMIN, Role.STUDENT, Role.SUPER_ADMIN] },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: parseSort(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data: rows.map(toAdminUserListItem),
    meta: { page, pageSize, total },
  }
}

export async function createAdminUser(input: CreateInput): Promise<AdminUserListItem> {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (existing) {
    throw conflict('Phone number is already registered')
  }

  const passwordHash = await argon2.hash(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash,
      role: input.role,
      phoneVerified: true,
    },
  })

  return toAdminUserListItem(user)
}

export async function updateAdminUser(
  actorId: string,
  userId: string,
  input: UpdateInput,
): Promise<AdminUserListItem> {
  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  })
  if (!target) {
    throw notFound('User not found')
  }

  if (target.role === Role.SUPER_ADMIN) {
    throw forbidden('Cannot modify a super admin account')
  }

  if (target.role === Role.INSTRUCTOR) {
    throw forbidden('Instructor accounts are disabled')
  }

  if (userId === actorId && input.isActive === false) {
    throw forbidden('You cannot deactivate your own account')
  }

  if (input.role === Role.STUDENT && target.role === Role.ADMIN) {
    // demoting admin — allowed
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })

  return toAdminUserListItem(user)
}
