import type { Batch, Course, Lesson, Module, Subject } from '@prisma/client'
import type { DeliveryMode, LessonType } from '../../shared/enums.js'

type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type SubjectWithModules = Subject & { modules: ModuleWithLessons[] }
type BatchSummary = Pick<Batch, 'id' | 'title' | 'slug' | 'status' | 'priceMinor' | 'startDate'>
type CourseRow = Course & {
  modules?: ModuleWithLessons[]
  subjects?: SubjectWithModules[]
  batches?: BatchSummary[]
}

export interface CourseListItem {
  id: string
  title: string
  slug: string
  deliveryMode: DeliveryMode
  thumbnail: string | null
  category: string | null
  priceMinor: number
  isPublished: boolean
  batchCount?: number
}

export interface CourseLessonDto {
  id: string
  title: string
  type: LessonType
  durationS: number | null
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
  priceMinor: number
  isPublished: boolean
  modules?: CourseModuleDto[]
  subjects?: CourseSubjectDto[]
  batches?: CourseBatchSummaryDto[]
}

export function toCourseListItem(
  course: Course & { _count?: { batches: number } },
): CourseListItem {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    deliveryMode: course.deliveryMode as DeliveryMode,
    thumbnail: course.thumbnail,
    category: course.category,
    priceMinor: course.priceMinor,
    isPublished: course.isPublished,
    ...('_count' in course && course._count
      ? { batchCount: course._count.batches }
      : {}),
  }
}

function toLessonDto(lesson: LessonRow, includeProtectedFields: boolean): CourseLessonDto {
  const base: CourseLessonDto = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type as LessonType,
    durationS: lesson.durationS,
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
  const base = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    deliveryMode: course.deliveryMode as DeliveryMode,
    description: course.description,
    thumbnail: course.thumbnail,
    category: course.category,
    priceMinor: course.priceMinor,
    isPublished: course.isPublished,
  }

  if (course.subjects) {
    return {
      ...base,
      subjects: course.subjects.map((subject) => ({
        id: subject.id,
        title: subject.title,
        order: subject.order,
        modules: subject.modules.map((mod) => toModuleDto(mod, includeProtectedFields)),
      })),
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
