import type { Batch, Course, Lesson, Module } from '@prisma/client'
import type { DeliveryMode, LessonType } from '../../shared/enums.js'
import { DeliveryMode as DeliveryModeEnum } from '../../shared/enums.js'

type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type BatchSummary = Pick<Batch, 'id' | 'title' | 'slug' | 'status' | 'priceMinor' | 'startDate'> & {
  _count?: { enrollments: number }
}
type CourseRow = Course & {
  category?: { title: string; slug: string } | null
  modules?: ModuleWithLessons[]
  batches?: BatchSummary[]
  _count?: { enrollments: number }
}

export interface CourseListItem {
  id: string
  title: string
  slug: string
  deliveryMode: DeliveryMode
  thumbnail: string | null
  category: string | null
  categorySlug: string | null
  categoryId: string | null
  priceMinor: number
  isPublished: boolean
  batchCount?: number
  studentCount?: number
}

export interface CourseFaqItem {
  question: string
  answer: string
}

export interface CourseLessonDto {
  id: string
  title: string
  type: LessonType
  durationS: number | null
  lectureDate: string | null
  order: number
  isPreview: boolean
  videoUrl?: string | null
  content?: string | null
}

export interface CourseModuleDto {
  id: string
  title: string
  order: number
  lessons: CourseLessonDto[]
}

export interface CourseSubjectDto {
  id: string
  title: string
  order: number
  modules: CourseModuleDto[]
}

export interface CourseBatchSummaryDto {
  id: string
  title: string
  slug: string
  status: string
  priceMinor: number
  startDate: string | null
}

export interface CourseDetailDto {
  id: string
  title: string
  slug: string
  deliveryMode: DeliveryMode
  description: string | null
  thumbnail: string | null
  category: string | null
  categorySlug: string | null
  categoryId: string | null
  priceMinor: number
  faq: CourseFaqItem[]
  isPublished: boolean
  modules?: CourseModuleDto[]
  subjects?: CourseSubjectDto[]
  batches?: CourseBatchSummaryDto[]
  studentCount?: number
}

export function parseFaq(value: unknown): CourseFaqItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is CourseFaqItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CourseFaqItem).question === 'string' &&
        typeof (item as CourseFaqItem).answer === 'string',
    )
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer)
}

export function toCourseListItem(
  course: Course & {
    category?: { title: string; slug: string } | null
    _count?: { batches: number; enrollments: number }
    batches?: { _count: { enrollments: number } }[]
  },
): CourseListItem {
  const batchEnrollmentTotal =
    course.batches?.reduce((sum, batch) => sum + (batch._count?.enrollments ?? 0), 0) ?? 0
  const studentCount =
    course.deliveryMode === DeliveryModeEnum.LIVE
      ? batchEnrollmentTotal
      : (course._count?.enrollments ?? 0)

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    deliveryMode: course.deliveryMode as DeliveryMode,
    thumbnail: course.thumbnail,
    category: course.category?.title ?? null,
    categorySlug: course.category?.slug ?? null,
    categoryId: course.categoryId,
    priceMinor: course.priceMinor,
    isPublished: course.isPublished,
    ...('_count' in course && course._count ? { batchCount: course._count.batches } : {}),
    studentCount,
  }
}

function formatLectureDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toLessonDto(lesson: LessonRow, includeProtectedFields: boolean): CourseLessonDto {
  const base: CourseLessonDto = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type as LessonType,
    durationS: lesson.durationS,
    lectureDate: lesson.lectureDate ? formatLectureDate(lesson.lectureDate) : null,
    order: lesson.order,
    isPreview: lesson.isPreview,
  }

  if (includeProtectedFields) {
    return {
      ...base,
      videoUrl: lesson.videoUrl,
      content: lesson.content,
    }
  }

  if (lesson.isPreview) {
    return { ...base, videoUrl: lesson.videoUrl }
  }

  return base
}

function toModuleDto(mod: ModuleWithLessons, includeProtectedFields: boolean): CourseModuleDto {
  return {
    id: mod.id,
    title: mod.title,
    order: mod.order,
    lessons: mod.lessons.map((lesson) => toLessonDto(lesson, includeProtectedFields)),
  }
}

export function toCourseDetail(
  course: CourseRow,
  includeProtectedFields: boolean,
): CourseDetailDto {
  const batchEnrollmentTotal =
    course.batches?.reduce((sum, batch) => sum + (batch._count?.enrollments ?? 0), 0) ?? 0
  const studentCount =
    course.deliveryMode === DeliveryModeEnum.LIVE
      ? batchEnrollmentTotal
      : (course._count?.enrollments ?? 0)

  const base = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    deliveryMode: course.deliveryMode as DeliveryMode,
    description: course.description,
    thumbnail: course.thumbnail,
    category: course.category?.title ?? null,
    categorySlug: course.category?.slug ?? null,
    categoryId: course.categoryId,
    priceMinor: course.priceMinor,
    faq: parseFaq(course.faq),
    isPublished: course.isPublished,
    studentCount,
  }

  if (course.deliveryMode === DeliveryModeEnum.LIVE) {
    return {
      ...base,
      ...(course.batches
        ? {
            batches: course.batches.map((b) => ({
              id: b.id,
              title: b.title,
              slug: b.slug,
              status: b.status,
              priceMinor: b.priceMinor,
              startDate: b.startDate?.toISOString() ?? null,
            })),
          }
        : {}),
    }
  }

  return {
    ...base,
    modules: (course.modules ?? []).map((mod) => toModuleDto(mod, includeProtectedFields)),
  }
}
