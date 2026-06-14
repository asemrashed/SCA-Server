import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, notFound } from '../../lib/errors.js'
import { Role } from '../../shared/enums.js'
import { isAdminStaff, isStaff } from '../../shared/roles.js'
import {
  courseListQuerySchema,
  createCourseSchema,
  updateCourseSchema,
} from '../../shared/schemas/course.js'

type CreateCourseInput = z.infer<typeof createCourseSchema>
type UpdateCourseInput = z.infer<typeof updateCourseSchema>
type CourseListQuery = z.infer<typeof courseListQuerySchema>
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  toCourseDetail,
  toCourseListItem,
  type CourseDetailDto,
  type CourseListItem,
} from './course.mapper.js'

const courseInclude = {
  modules: {
    orderBy: { order: 'asc' as const },
    include: {
      lessons: {
        orderBy: { order: 'asc' as const },
      },
    },
  },
} satisfies Prisma.CourseInclude

function parseSort(sort?: string): Prisma.CourseOrderByWithRelationInput {
  if (!sort) return { createdAt: 'desc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['createdAt', 'title', 'priceMinor', 'updatedAt'])
  if (!allowed.has(field)) return { createdAt: 'desc' }
  return { [field]: dir === 'asc' ? 'asc' : 'desc' }
}

function canViewProtectedContent(role?: Role): boolean {
  return role !== undefined && isStaff(role)
}

async function findCourseOrThrow(idOrSlug: string) {
  const course = await prisma.course.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: courseInclude,
  })
  if (!course) {
    throw notFound('Course not found')
  }
  return course
}

async function createNestedContent(
  courseId: string,
  modules: NonNullable<CreateCourseInput['modules']>,
): Promise<void> {
  for (const mod of modules) {
    const createdModule = await prisma.module.create({
      data: {
        courseId,
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

async function replaceNestedContent(
  courseId: string,
  modules: NonNullable<UpdateCourseInput['modules']>,
): Promise<void> {
  await prisma.module.deleteMany({ where: { courseId } })
  await createNestedContent(courseId, modules)
}

export async function listCourses(
  query: CourseListQuery,
  role?: Role,
): Promise<ApiListResponse<CourseListItem>> {
  const { page, pageSize, search, category, sort } = query
  const where: Prisma.CourseWhereInput = {
    deletedAt: null,
    ...(canViewProtectedContent(role) ? {} : { isPublished: true }),
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [total, rows] = await prisma.$transaction([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: parseSort(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data: rows.map(toCourseListItem),
    meta: { page, pageSize, total },
  }
}

export async function getCourseByIdOrSlug(
  idOrSlug: string,
  role?: Role,
): Promise<CourseDetailDto> {
  const course = await findCourseOrThrow(idOrSlug)
  if (!course.isPublished && !canViewProtectedContent(role)) {
    throw notFound('Course not found')
  }
  return toCourseDetail(course, canViewProtectedContent(role))
}

export async function createCourse(input: CreateCourseInput): Promise<CourseDetailDto> {
  const existing = await prisma.course.findUnique({ where: { slug: input.slug } })
  if (existing) {
    throw conflict('A course with this slug already exists')
  }

  const { modules, ...courseData } = input
  const course = await prisma.course.create({
    data: courseData,
  })

  if (modules?.length) {
    await createNestedContent(course.id, modules)
  }

  return getCourseByIdOrSlug(course.id, Role.ADMIN)
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
): Promise<CourseDetailDto> {
  const existing = await prisma.course.findFirst({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw notFound('Course not found')
  }

  if (input.slug && input.slug !== existing.slug) {
    const slugTaken = await prisma.course.findUnique({ where: { slug: input.slug } })
    if (slugTaken) {
      throw conflict('A course with this slug already exists')
    }
  }

  const { modules, ...courseData } = input
  await prisma.course.update({
    where: { id },
    data: courseData,
  })

  if (modules !== undefined) {
    await replaceNestedContent(id, modules)
  }

  return getCourseByIdOrSlug(id, Role.ADMIN)
}

export async function deleteCourse(id: string): Promise<void> {
  const existing = await prisma.course.findFirst({
    where: { id, deletedAt: null },
  })
  if (!existing) {
    throw notFound('Course not found')
  }

  await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
