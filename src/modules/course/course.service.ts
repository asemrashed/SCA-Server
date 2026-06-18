import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, notFound, validationError } from '../../lib/errors.js'
import { DeliveryMode, Role } from '../../shared/enums.js'
import { isAdminStaff, isStaff } from '../../shared/roles.js'
import {
  courseListQuerySchema,
  createCourseSchema,
  updateCourseSchema,
} from '../../shared/schemas/course.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  toCourseDetail,
  toCourseListItem,
  type CourseDetailDto,
  type CourseListItem,
} from './course.mapper.js'

type CreateCourseInput = z.infer<typeof createCourseSchema>
type UpdateCourseInput = z.infer<typeof updateCourseSchema>
type CourseListQuery = z.infer<typeof courseListQuerySchema>

const categorySelect = {
  category: { select: { title: true, slug: true } },
} satisfies Prisma.CourseInclude

const recordedInclude = {
  ...categorySelect,
  modules: {
    orderBy: { order: 'asc' as const },
    include: {
      lessons: { orderBy: { order: 'asc' as const } },
    },
  },
} satisfies Prisma.CourseInclude

const liveInclude = {
  ...categorySelect,
  batches: {
    where: { deletedAt: null },
    orderBy: { startDate: 'asc' as const },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      priceMinor: true,
      startDate: true,
      _count: { select: { enrollments: true } },
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

function assertCurriculumMatchesDeliveryMode(
  deliveryMode: DeliveryMode,
  payload: { modules?: unknown },
  action: 'create' | 'update',
): void {
  const verb = action === 'create' ? 'create' : 'update'

  if (deliveryMode === DeliveryMode.LIVE && payload.modules !== undefined) {
    throw validationError(`LIVE courses use batch-scoped subjects, not top-level modules (${verb})`)
  }
}

async function clearRecordedCurriculum(courseId: string): Promise<void> {
  await prisma.module.deleteMany({ where: { courseId } })
}

async function findCourseOrThrow(idOrSlug: string, role?: Role) {
  const course = await prisma.course.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  })
  if (!course) {
    throw notFound('Course not found')
  }

  const include = course.deliveryMode === DeliveryMode.LIVE ? liveInclude : recordedInclude
  const full = await prisma.course.findUnique({
    where: { id: course.id },
    include: {
      ...include,
      _count: { select: { enrollments: true } },
    } as any,
  })
  if (!full) {
    throw notFound('Course not found')
  }
  if (!full.isPublished && !canViewProtectedContent(role)) {
    throw notFound('Course not found')
  }
  return full
}

function parseLectureDate(value: string | null | undefined): Date | null {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`)
}

async function createRecordedModules(
  courseId: string,
  modules: NonNullable<Extract<CreateCourseInput, { deliveryMode: DeliveryMode.RECORDED }>['modules']>,
): Promise<void> {
  for (const mod of modules) {
    const createdModule = await prisma.module.create({
      data: { courseId, title: mod.title, order: mod.order },
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
          lectureDate: parseLectureDate(lesson.lectureDate),
          order: lesson.order,
          isPreview: lesson.isPreview,
        })),
      })
    }
  }
}

async function replaceRecordedModules(
  courseId: string,
  modules: NonNullable<UpdateCourseInput['modules']>,
): Promise<void> {
  await clearRecordedCurriculum(courseId)
  if (modules.length) {
    await createRecordedModules(courseId, modules)
  }
}

export async function listCourses(
  query: CourseListQuery,
  role?: Role,
): Promise<ApiListResponse<CourseListItem>> {
  const { page, pageSize, search, category, deliveryMode, sort } = query
  const where: Prisma.CourseWhereInput = {
    deletedAt: null,
    ...(canViewProtectedContent(role) ? {} : { isPublished: true }),
    ...(category ? { category: { slug: category, deletedAt: null } } : {}),
    ...(deliveryMode ? { deliveryMode } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { category: { title: { contains: search, mode: 'insensitive' } } },
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
      include: {
        ...categorySelect,
        _count: { select: { batches: true, enrollments: true } },
        batches: {
          where: { deletedAt: null },
          select: { _count: { select: { enrollments: true } } },
        },
      },
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
  const course = await findCourseOrThrow(idOrSlug, role)
  return toCourseDetail(course, canViewProtectedContent(role))
}

export async function createCourse(input: CreateCourseInput): Promise<CourseDetailDto> {
  if (input.deliveryMode === DeliveryMode.RECORDED) {
    assertCurriculumMatchesDeliveryMode(input.deliveryMode, input, 'create')
  }

  const existing = await prisma.course.findUnique({ where: { slug: input.slug } })
  if (existing) {
    throw conflict('A course with this slug already exists')
  }

  const { deliveryMode, title, slug, description, thumbnail, categoryId, priceMinor, faq, isPublished } =
    input

  const course = await prisma.course.create({
    data: {
      deliveryMode,
      title,
      slug,
      description: description ?? null,
      thumbnail: thumbnail ?? null,
      categoryId: categoryId ?? null,
      priceMinor: deliveryMode === DeliveryMode.LIVE ? 0 : priceMinor,
      ...(faq !== undefined ? { faq: faq as Prisma.InputJsonValue } : {}),
      isPublished,
    },
  })

  if (deliveryMode === DeliveryMode.RECORDED && input.modules?.length) {
    await createRecordedModules(course.id, input.modules)
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

  if (input.modules !== undefined) {
    assertCurriculumMatchesDeliveryMode(existing.deliveryMode as DeliveryMode, input, 'update')
  }

  if (input.modules !== undefined && existing.deliveryMode !== DeliveryMode.RECORDED) {
    throw validationError('Only RECORDED courses have modules')
  }

  const { modules, faq, ...courseData } = input
  const updateData: Prisma.CourseUpdateInput = {
    ...courseData,
    ...(faq !== undefined ? { faq: faq as Prisma.InputJsonValue } : {}),
    ...(existing.deliveryMode === DeliveryMode.LIVE && courseData.priceMinor !== undefined
      ? { priceMinor: 0 }
      : {}),
  }
  await prisma.course.update({
    where: { id },
    data: updateData,
  })

  if (modules !== undefined) {
    await replaceRecordedModules(id, modules)
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
