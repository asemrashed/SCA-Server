import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { forbidden, notFound, validationError } from '../../lib/errors.js'
import { ResourceCategory, Role } from '../../shared/enums.js'
import { isAdminStaff } from '../../shared/roles.js'
import {
  createResourceSchema,
  resourceListQuerySchema,
  updateResourceSchema,
} from '../../shared/schemas/resource.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  assertStudentCourseContentAccess,
  isStudentCourseContentAccess,
} from '../enrollment/enrollment.access.js'
import { toResourceDto, type ResourceDto } from './resource.mapper.js'

type CreateResourceInput = z.infer<typeof createResourceSchema>
type UpdateResourceInput = z.infer<typeof updateResourceSchema>
type ResourceListQuery = z.infer<typeof resourceListQuerySchema>

const PDF_ONLY_CATEGORIES = new Set<ResourceCategory>([
  ResourceCategory.LECTURE_SHEET,
  ResourceCategory.SOLUTION_PDF,
  ResourceCategory.NOTICE,
  ResourceCategory.RESULT_SHEET,
  ResourceCategory.EXAM,
  ResourceCategory.ASSIGNMENT,
])

function parseSort(sort?: string): Prisma.ResourceOrderByWithRelationInput {
  if (!sort) return { createdAt: 'desc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['createdAt', 'title'])
  if (!allowed.has(field)) return { createdAt: 'desc' }
  return { [field]: dir === 'asc' ? 'asc' : 'desc' }
}

function normalizeFileType(
  category: ResourceCategory,
  fileType: string | null | undefined,
): string | null {
  if (PDF_ONLY_CATEGORIES.has(category)) return 'pdf'
  return fileType ?? null
}

async function assertCanViewCourse(
  userId: string,
  role: Role,
  courseId: string,
): Promise<void> {
  if (isAdminStaff(role)) return
  if (role === Role.INSTRUCTOR) return
  if (role === Role.STUDENT) {
    const allowed = await isStudentCourseContentAccess(userId, courseId)
    if (!allowed) {
      throw forbidden('Not enrolled in this course')
    }
    return
  }
  throw forbidden()
}

async function assertInstructorOnCourse(
  userId: string,
  role: Role,
  courseId: string,
): Promise<void> {
  if (isAdminStaff(role)) return
  const assigned = await prisma.batchInstructor.findFirst({
    where: { instructorId: userId, batch: { courseId } },
  })
  if (!assigned) {
    throw forbidden('Not assigned to a batch in this course')
  }
}

async function validatePlacement(input: {
  courseId: string
  subjectId?: string | null
  moduleId?: string | null
  lessonId?: string | null
}): Promise<void> {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, deletedAt: null },
  })
  if (!course) {
    throw notFound('Course not found')
  }

  if (input.subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } })
    if (!subject || subject.courseId !== input.courseId) {
      throw validationError('Subject does not belong to this course')
    }
  }

  if (input.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      include: { module: { include: { subject: true } } },
    })
    if (!lesson) {
      throw notFound('Lesson not found')
    }

    const module = lesson.module
    const lessonCourseId =
      module.courseId ?? module.subject?.courseId ?? null
    if (lessonCourseId !== input.courseId) {
      throw validationError('Lesson does not belong to this course')
    }
  }

  if (input.moduleId) {
    const module = await prisma.module.findUnique({
      where: { id: input.moduleId },
      include: { subject: true },
    })
    if (!module) {
      throw notFound('Module not found')
    }

    const moduleCourseId = module.courseId ?? module.subject?.courseId ?? null
    if (moduleCourseId !== input.courseId) {
      throw validationError('Module does not belong to this course')
    }
  }
}

async function getResourceOrThrow(resourceId: string) {
  const row = await prisma.resource.findUnique({ where: { id: resourceId } })
  if (!row) {
    throw notFound('Resource not found')
  }
  return row
}

export async function listResources(
  userId: string,
  role: Role,
  query: ResourceListQuery,
): Promise<ApiListResponse<ResourceDto>> {
  await assertCanViewCourse(userId, role, query.courseId)

  const where: Prisma.ResourceWhereInput = {
    courseId: query.courseId,
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.moduleId ? { moduleId: query.moduleId } : {}),
    ...(query.lessonId ? { lessonId: query.lessonId } : {}),
    ...(query.category ? { category: query.category } : {}),
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
    data: rows.map((row) => toResourceDto(row, role)),
    meta: { page: query.page, pageSize: query.pageSize, total },
  }
}

export async function createResource(
  userId: string,
  role: Role,
  input: CreateResourceInput,
): Promise<ResourceDto> {
  await validatePlacement(input)
  await assertInstructorOnCourse(userId, role, input.courseId)

  const category = input.category ?? ResourceCategory.GENERAL
  const row = await prisma.resource.create({
    data: {
      title: input.title,
      fileUrl: input.fileUrl,
      fileType: normalizeFileType(category, input.fileType),
      category,
      courseId: input.courseId,
      subjectId: input.subjectId ?? null,
      moduleId: input.moduleId ?? null,
      lessonId: input.lessonId ?? null,
    },
  })

  return toResourceDto(row, role)
}

export async function updateResource(
  userId: string,
  role: Role,
  resourceId: string,
  input: UpdateResourceInput,
): Promise<ResourceDto> {
  const existing = await getResourceOrThrow(resourceId)
  await assertInstructorOnCourse(userId, role, existing.courseId)

  const category = input.category ?? (existing.category as ResourceCategory)
  await validatePlacement({
    courseId: existing.courseId,
    subjectId: input.subjectId !== undefined ? input.subjectId : existing.subjectId,
    moduleId: input.moduleId !== undefined ? input.moduleId : existing.moduleId,
    lessonId: input.lessonId !== undefined ? input.lessonId : existing.lessonId,
  })

  const row = await prisma.resource.update({
    where: { id: resourceId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.fileUrl !== undefined ? { fileUrl: input.fileUrl } : {}),
      ...(input.fileType !== undefined || PDF_ONLY_CATEGORIES.has(category)
        ? { fileType: normalizeFileType(category, input.fileType ?? existing.fileType) }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
      ...(input.moduleId !== undefined ? { moduleId: input.moduleId } : {}),
      ...(input.lessonId !== undefined ? { lessonId: input.lessonId } : {}),
    },
  })

  return toResourceDto(row, role)
}

export async function deleteResource(
  userId: string,
  role: Role,
  resourceId: string,
): Promise<void> {
  const existing = await getResourceOrThrow(resourceId)
  await assertInstructorOnCourse(userId, role, existing.courseId)
  await prisma.resource.delete({ where: { id: resourceId } })
}

export async function streamResource(
  userId: string,
  role: Role,
  resourceId: string,
): Promise<{ buffer: Buffer; contentType: string; title: string }> {
  const row = await getResourceOrThrow(resourceId)

  await assertCanViewCourse(userId, role, row.courseId)

  if (row.fileType === 'link') {
    throw validationError('This resource is an external link, not a streamable file')
  }

  const upstream = await fetch(row.fileUrl)
  if (!upstream.ok) {
    throw notFound('File could not be loaded from storage')
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const contentType =
    upstream.headers.get('content-type') ??
    (row.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream')

  return { buffer, contentType, title: row.title }
}

export { assertStudentCourseContentAccess }
