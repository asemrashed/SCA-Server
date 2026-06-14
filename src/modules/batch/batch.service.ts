import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, notFound, validationError } from '../../lib/errors.js'
import { BatchStatus, Role } from '../../shared/enums.js'
import { isAdminStaff } from '../../shared/roles.js'
import {
  batchListQuerySchema,
  createBatchSchema,
  updateBatchSchema,
} from '../../shared/schemas/batch.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  toBatchDetail,
  toBatchListItem,
  type BatchDetailDto,
  type BatchListItem,
} from './batch.mapper.js'

type CreateBatchInput = z.infer<typeof createBatchSchema>
type UpdateBatchInput = z.infer<typeof updateBatchSchema>
type BatchListQuery = z.infer<typeof batchListQuerySchema>

const batchInclude = {
  subjects: {
    orderBy: { order: 'asc' as const },
    include: {
      modules: {
        orderBy: { order: 'asc' as const },
        include: {
          lessons: {
            orderBy: { order: 'asc' as const },
          },
        },
      },
    },
  },
  instructors: {
    include: {
      instructor: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  },
} satisfies Prisma.BatchInclude

const PUBLIC_STATUSES: BatchStatus[] = [
  BatchStatus.UPCOMING,
  BatchStatus.ACTIVE,
  BatchStatus.COMPLETED,
]

function parseSort(sort?: string): Prisma.BatchOrderByWithRelationInput {
  if (!sort) return { createdAt: 'desc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['createdAt', 'title', 'priceMinor', 'startDate', 'updatedAt'])
  if (!allowed.has(field)) return { createdAt: 'desc' }
  return { [field]: dir === 'asc' ? 'asc' : 'desc' }
}

function canViewProtectedContent(role?: Role): boolean {
  return role !== undefined && isAdminStaff(role)
}

async function validateInstructorIds(instructorIds: string[]): Promise<void> {
  if (!instructorIds.length) return

  const users = await prisma.user.findMany({
    where: {
      id: { in: instructorIds },
      deletedAt: null,
      isActive: true,
      role: { in: [Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN] },
    },
    select: { id: true },
  })

  if (users.length !== instructorIds.length) {
    throw validationError('One or more instructor IDs are invalid')
  }
}

async function findBatchOrThrow(idOrSlug: string) {
  const batch = await prisma.batch.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: batchInclude,
  })
  if (!batch) {
    throw notFound('Batch not found')
  }
  return batch
}

async function createNestedContent(
  batchId: string,
  subjects: NonNullable<CreateBatchInput['subjects']>,
): Promise<void> {
  for (const subject of subjects) {
    const createdSubject = await prisma.subject.create({
      data: {
        batchId,
        title: subject.title,
        order: subject.order,
      },
    })

    if (!subject.modules?.length) continue

    for (const mod of subject.modules) {
      const createdModule = await prisma.module.create({
        data: {
          subjectId: createdSubject.id,
          title: mod.title,
          order: mod.order,
        },
      })

      if (mod.lessons?.length) {
        await prisma.lesson.createMany({
          data: mod.lessons.map((lesson) => ({
            moduleId: createdModule.id,
            title: lesson.title,
            type: lesson.type,
            videoUrl: lesson.videoUrl ?? null,
            content: lesson.content ?? null,
            durationS: lesson.durationS ?? null,
            order: lesson.order,
            isPreview: lesson.isPreview,
          })),
        })
      }
    }
  }
}

async function replaceNestedContent(
  batchId: string,
  subjects: NonNullable<UpdateBatchInput['subjects']>,
): Promise<void> {
  await prisma.subject.deleteMany({ where: { batchId } })
  await createNestedContent(batchId, subjects)
}

async function syncInstructors(batchId: string, instructorIds: string[]): Promise<void> {
  await prisma.batchInstructor.deleteMany({ where: { batchId } })
  if (!instructorIds.length) return

  await prisma.batchInstructor.createMany({
    data: instructorIds.map((instructorId) => ({ batchId, instructorId })),
  })
}

export async function listBatches(
  query: BatchListQuery,
  role?: Role,
  instructorUserId?: string,
): Promise<ApiListResponse<BatchListItem>> {
  const { page, pageSize, search, status, sort } = query
  const where: Prisma.BatchWhereInput = {
    deletedAt: null,
    ...(role === Role.INSTRUCTOR && instructorUserId
      ? { instructors: { some: { instructorId: instructorUserId } } }
      : {}),
    ...(canViewProtectedContent(role)
      ? status
        ? { status }
        : {}
      : { status: status ?? { in: PUBLIC_STATUSES } }),
    ...(search
      ? {
          OR: [{ title: { contains: search, mode: 'insensitive' } }],
        }
      : {}),
  }

  const [total, rows] = await prisma.$transaction([
    prisma.batch.count({ where }),
    prisma.batch.findMany({
      where,
      orderBy: parseSort(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data: rows.map(toBatchListItem),
    meta: { page, pageSize, total },
  }
}

export async function getBatchByIdOrSlug(
  idOrSlug: string,
  role?: Role,
): Promise<BatchDetailDto> {
  const batch = await findBatchOrThrow(idOrSlug)
  if (!canViewProtectedContent(role) && !PUBLIC_STATUSES.includes(batch.status as BatchStatus)) {
    throw notFound('Batch not found')
  }
  return toBatchDetail(batch, canViewProtectedContent(role))
}

export async function createBatch(input: CreateBatchInput): Promise<BatchDetailDto> {
  const existing = await prisma.batch.findUnique({ where: { slug: input.slug } })
  if (existing) {
    throw conflict('A batch with this slug already exists')
  }

  const { subjects, instructorIds, ...batchData } = input

  if (instructorIds?.length) {
    await validateInstructorIds(instructorIds)
  }

  const batch = await prisma.batch.create({
    data: batchData,
  })

  if (instructorIds?.length) {
    await syncInstructors(batch.id, instructorIds)
  }

  if (subjects?.length) {
    await createNestedContent(batch.id, subjects)
  }

  return getBatchByIdOrSlug(batch.id, Role.ADMIN)
}

export async function updateBatch(id: string, input: UpdateBatchInput): Promise<BatchDetailDto> {
  const existing = await prisma.batch.findFirst({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw notFound('Batch not found')
  }

  if (input.slug && input.slug !== existing.slug) {
    const slugTaken = await prisma.batch.findUnique({ where: { slug: input.slug } })
    if (slugTaken) {
      throw conflict('A batch with this slug already exists')
    }
  }

  const { subjects, instructorIds, ...batchData } = input

  if (instructorIds !== undefined) {
    await validateInstructorIds(instructorIds)
  }

  await prisma.batch.update({
    where: { id },
    data: batchData,
  })

  if (instructorIds !== undefined) {
    await syncInstructors(id, instructorIds)
  }

  if (subjects !== undefined) {
    await replaceNestedContent(id, subjects)
  }

  return getBatchByIdOrSlug(id, Role.ADMIN)
}

export async function deleteBatch(id: string): Promise<void> {
  const existing = await prisma.batch.findFirst({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw notFound('Batch not found')
  }

  await prisma.batch.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
