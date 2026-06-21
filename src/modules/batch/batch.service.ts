import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, notFound, validationError } from '../../lib/errors.js'
import { generateUniqueSlug, slugifyTitle } from '../../lib/slug.js'
import { BatchStatus, DeliveryMode, Role } from '../../shared/enums.js'
import { isAdminStaff } from '../../shared/roles.js'
import { createContentGrantSchema } from '../../shared/schemas/course.js'
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
type CreateContentGrantInput = z.infer<typeof createContentGrantSchema>

const batchInclude = {
  course: {
    select: {
      id: true,
      title: true,
      slug: true,
      deliveryMode: true,
      description: true,
      faq: true,
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

async function validateLiveCourse(courseId: string): Promise<void> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null, deliveryMode: DeliveryMode.LIVE },
  })
  if (!course) {
    throw validationError('courseId must reference a live course')
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

export async function listBatches(
  query: BatchListQuery,
  role?: Role,
): Promise<ApiListResponse<BatchListItem>> {
  const { page, pageSize, search, status, courseId, categoryId, year, sort } = query
  const where: Prisma.BatchWhereInput = {
    deletedAt: null,
    ...(courseId ? { courseId } : {}),
    ...(categoryId ? { course: { categoryId, deletedAt: null } } : {}),
    ...(year
      ? {
          startDate: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        }
      : {}),
    ...(canViewProtectedContent(role)
      ? status
        ? { status }
        : {}
      : { status: status ?? { in: PUBLIC_STATUSES } }),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { course: { title: { contains: search, mode: 'insensitive' } } },
          ],
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
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            deliveryMode: true,
            category: { select: { title: true } },
          },
        },
      },
    }),
  ])

  return {
    data: rows.map(toBatchListItem),
    meta: { page, pageSize, total },
  }
}

export async function listBatchesByCourse(
  courseId: string,
  role?: Role,
): Promise<BatchListItem[]> {
  const result = await listBatches(
    { page: 1, pageSize: 100, courseId },
    role,
  )
  return result.data
}

export async function getBatchByIdOrSlug(
  idOrSlug: string,
  role?: Role,
): Promise<BatchDetailDto> {
  const batch = await findBatchOrThrow(idOrSlug)
  if (!canViewProtectedContent(role) && !PUBLIC_STATUSES.includes(batch.status as BatchStatus)) {
    throw notFound('Batch not found')
  }
  return toBatchDetail(batch)
}

export async function createBatch(input: CreateBatchInput): Promise<BatchDetailDto> {
  await validateLiveCourse(input.courseId)

  const titleTaken = await prisma.batch.findFirst({
    where: {
      deletedAt: null,
      courseId: input.courseId,
      title: { equals: input.title, mode: 'insensitive' },
    },
  })
  if (titleTaken) {
    throw conflict('A batch with this title already exists in this course')
  }

  const slug =
    input.slug ??
    (await generateUniqueSlug(slugifyTitle(input.title), async (candidate) => {
      const existing = await prisma.batch.findUnique({ where: { slug: candidate } })
      return existing !== null
    }))

  const { slug: _slug, ...batchData } = input

  const batch = await prisma.batch.create({
    data: { ...batchData, slug },
  })

  return getBatchByIdOrSlug(batch.id, Role.ADMIN)
}

export async function updateBatch(id: string, input: UpdateBatchInput): Promise<BatchDetailDto> {
  const existing = await prisma.batch.findFirst({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw notFound('Batch not found')
  }

  if (input.title && input.title.toLowerCase() !== existing.title.toLowerCase()) {
    const titleTaken = await prisma.batch.findFirst({
      where: {
        deletedAt: null,
        courseId: existing.courseId,
        title: { equals: input.title, mode: 'insensitive' },
        id: { not: id },
      },
    })
    if (titleTaken) {
      throw conflict('A batch with this title already exists in this course')
    }
  }

  if (input.slug && input.slug !== existing.slug) {
    const slugTaken = await prisma.batch.findUnique({ where: { slug: input.slug } })
    if (slugTaken) {
      throw conflict('A batch with this slug already exists')
    }
  }

  await prisma.batch.update({
    where: { id },
    data: input,
  })

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

export async function listContentGrants(receivingBatchId: string) {
  const batch = await prisma.batch.findFirst({
    where: { id: receivingBatchId, deletedAt: null },
  })
  if (!batch) {
    throw notFound('Batch not found')
  }

  return prisma.batchContentGrant.findMany({
    where: { receivingBatchId },
    include: {
      grantingBatch: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createContentGrant(
  receivingBatchId: string,
  input: CreateContentGrantInput,
) {
  const [receiving, granting] = await Promise.all([
    prisma.batch.findFirst({ where: { id: receivingBatchId, deletedAt: null } }),
    prisma.batch.findFirst({ where: { id: input.grantingBatchId, deletedAt: null } }),
  ])
  if (!receiving || !granting) {
    throw notFound('Batch not found')
  }
  if (receiving.courseId !== granting.courseId) {
    throw validationError('Both batches must belong to the same live course')
  }
  if (receivingBatchId === input.grantingBatchId) {
    throw validationError('Cannot grant a batch access to itself')
  }

  try {
    return await prisma.batchContentGrant.create({
      data: {
        receivingBatchId,
        grantingBatchId: input.grantingBatchId,
      },
      include: {
        grantingBatch: { select: { id: true, title: true, slug: true } },
      },
    })
  } catch {
    throw conflict('This content grant already exists')
  }
}

export async function deleteContentGrant(receivingBatchId: string, grantId: string): Promise<void> {
  const grant = await prisma.batchContentGrant.findFirst({
    where: { id: grantId, receivingBatchId },
  })
  if (!grant) {
    throw notFound('Content grant not found')
  }
  await prisma.batchContentGrant.delete({ where: { id: grantId } })
}
