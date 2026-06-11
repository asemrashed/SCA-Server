import type { Course, Lesson, Module } from '@prisma/client'
import type { LessonType } from '../../shared/enums.js'

type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type CourseWithModules = Course & { modules: ModuleWithLessons[] }

export interface CourseListItem {
  id: string
  title: string
  slug: string
  thumbnail: string | null
  category: string | null
  priceMinor: number
  isPublished: boolean
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

export interface CourseDetailDto {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail: string | null
  category: string | null
  priceMinor: number
  isPublished: boolean
  modules: CourseModuleDto[]
}

export function toCourseListItem(course: Course): CourseListItem {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    thumbnail: course.thumbnail,
    category: course.category,
    priceMinor: course.priceMinor,
    isPublished: course.isPublished,
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

export function toCourseDetail(
  course: CourseWithModules,
  includeProtectedFields: boolean,
): CourseDetailDto {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnail: course.thumbnail,
    category: course.category,
    priceMinor: course.priceMinor,
    isPublished: course.isPublished,
    modules: course.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: mod.lessons.map((lesson) => toLessonDto(lesson, includeProtectedFields)),
    })),
  }
}
