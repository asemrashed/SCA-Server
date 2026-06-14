import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { forbidden, notFound, validationError } from '../../lib/errors.js'
import { EnrollmentStatus, Role } from '../../shared/enums.js'
import { isAdminStaff } from '../../shared/roles.js'
import {
  createResourceSchema,
  resourceListQuerySchema,
} from '../../shared/schemas/resource.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import { toResourceDto, type ResourceDto } from './resource.mapper.js'

type CreateResourceInput = z.infer<typeof createResourceSchema>
type ResourceListQuery = z.infer<typeof resourceListQuerySchema>

function parseSort(sort?: string): Prisma.ResourceOrderByWithRelationInput {
  if (!sort) return { createdAt: 'desc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['createdAt', 'title'])
  if (!allowed.has(field)) return { createdAt: 'desc' }
  return { [field]: dir === 'asc' ? 'asc' : 'desc' }
}

async function assertCanViewScope(
  userId: string,
  role: Role,
  batchId?: string,
  courseId?: string,
): Promise<void> {
  if (isAdminStaff(role)) return

  if (courseId) {
    if (role === Role.INSTRUCTOR) return
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: userId,
        courseId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
    })
    if (!enrollment) {
      throw forbidden('Not enrolled in this course')
    }
    return
  }

  if (batchId) {
    if (role === Role.INSTRUCTOR) {
      const assigned = await prisma.batchInstructor.findFirst({
        where: { batchId, instructorId: userId },
      })
      if (assigned) return
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: userId,
        batchId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
    })
    if (!enrollment) {
      throw forbidden('Not enrolled in this batch')
    }
  }
}

async function assertInstructorCanManageBatch(
  userId: string,
  role: Role,
  batchId: string,
): Promise<void> {
  if (isAdminStaff(role)) return
  const assigned = await prisma.batchInstructor.findFirst({
    where: { batchId, instructorId: userId },
  })
  if (!assigned) {
    throw forbidden('Not assigned to this batch')
  }
}

async function validatePlacement(input: CreateResourceInput): Promise<void> {
  if (input.courseId) {
    const course = await prisma.course.findFirst({
      where: { id: input.courseId, deletedAt: null },
    })
    if (!course) {
      throw notFound('Course not found')
    }
  }

  if (input.batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, deletedAt: null },
    })
    if (!batch) {
      throw notFound('Batch not found')
    }
  }

  if (input.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      include: { module: true },
    })
    if (!lesson) {
      throw notFound('Lesson not found')
    }

    const module = lesson.module
    if (input.courseId) {
      if (module.courseId !== input.courseId) {
        throw validationError('Lesson does not belong to this course')
      }
    } else if (input.batchId) {
      if (!module.subjectId) {
        throw validationError('Lesson does not belong to this batch')
      }
      const subject = await prisma.subject.findUnique({ where: { id: module.subjectId } })
      if (!subject || subject.batchId !== input.batchId) {
        throw validationError('Lesson does not belong to this batch')
      }
    }
  }

  if (input.moduleId) {
    const module = await prisma.module.findUnique({ where: { id: input.moduleId } })
    if (!module) {
      throw notFound('Module not found')
    }

    if (input.courseId) {
      if (module.courseId !== input.courseId) {
        throw validationError('Module does not belong to this course')
      }
    } else if (input.batchId) {
      if (!module.subjectId) {
        throw validationError('Module does not belong to this batch')
      }
      const subject = await prisma.subject.findUnique({ where: { id: module.subjectId } })
      if (!subject || subject.batchId !== input.batchId) {
        throw validationError('Module does not belong to this batch')
      }
    }
  }
}

export async function listResources(
  userId: string,
  role: Role,
  query: ResourceListQuery,
): Promise<ApiListResponse<ResourceDto>> {
  await assertCanViewScope(userId, role, query.batchId, query.courseId)

  const where: Prisma.ResourceWhereInput = {
    ...(query.batchId ? { batchId: query.batchId } : { courseId: query.courseId }),
    ...(query.moduleId ? { moduleId: query.moduleId } : {}),
    ...(query.lessonId ? { lessonId: query.lessonId } : {}),
    ...(query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy: parseSort(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    data: rows.map(toResourceDto),
    meta: { page: query.page, pageSize: query.pageSize, total },
  }
}

export async function createResource(
  userId: string,
  role: Role,
  input: CreateResourceInput,
): Promise<ResourceDto> {
  await validatePlacement(input)

  if (input.batchId) {
    await assertInstructorCanManageBatch(userId, role, input.batchId)
  }

  const row = await prisma.resource.create({
    data: {
      title: input.title,
      fileUrl: input.fileUrl,
      fileType: input.fileType ?? null,
      batchId: input.batchId ?? null,
      courseId: input.courseId ?? null,
      moduleId: input.moduleId ?? null,
      lessonId: input.lessonId ?? null,
    },
  })

  return toResourceDto(row)
}
