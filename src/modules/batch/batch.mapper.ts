import type { Batch, BatchInstructor, Lesson, Module, Subject, User } from '@prisma/client'
import type { BatchStatus, LessonType } from '../../shared/enums.js'

type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type SubjectWithModules = Subject & { modules: ModuleWithLessons[] }
type InstructorRow = BatchInstructor & { instructor: Pick<User, 'id' | 'name' | 'avatarUrl'> }
type BatchWithContent = Batch & {
  subjects: SubjectWithModules[]
  instructors: InstructorRow[]
}

export interface BatchListItem {
  id: string
  title: string
  slug: string
  status: BatchStatus
  priceMinor: number
  capacity: number | null
  registrationDeadline: string | null
  startDate: string | null
  endDate: string | null
  thumbnail: string | null
}

export interface BatchInstructorDto {
  id: string
  name: string
  avatarUrl: string | null
}

export interface BatchLessonDto {
  id: string
  title: string
  type: LessonType
  durationS: number | null
  order: number
  isPreview: boolean
  videoUrl?: string | null
  content?: string | null
}

export interface BatchModuleDto {
  id: string
  title: string
  order: number
  lessons: BatchLessonDto[]
}

export interface BatchSubjectDto {
  id: string
  title: string
  order: number
  modules: BatchModuleDto[]
}

export interface BatchDetailDto {
  id: string
  title: string
  slug: string
  status: BatchStatus
  priceMinor: number
  capacity: number | null
  registrationDeadline: string | null
  startDate: string | null
  endDate: string | null
  thumbnail: string | null
  instructors: BatchInstructorDto[]
  subjects: BatchSubjectDto[]
}

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

export function toBatchListItem(batch: Batch): BatchListItem {
  return {
    id: batch.id,
    title: batch.title,
    slug: batch.slug,
    status: batch.status as BatchStatus,
    priceMinor: batch.priceMinor,
    capacity: batch.capacity,
    registrationDeadline: toIso(batch.registrationDeadline),
    startDate: toIso(batch.startDate),
    endDate: toIso(batch.endDate),
    thumbnail: batch.thumbnail,
  }
}

function toLessonDto(lesson: LessonRow, includeProtectedFields: boolean): BatchLessonDto {
  const base: BatchLessonDto = {
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

export function toBatchDetail(
  batch: BatchWithContent,
  includeProtectedFields: boolean,
): BatchDetailDto {
  return {
    id: batch.id,
    title: batch.title,
    slug: batch.slug,
    status: batch.status as BatchStatus,
    priceMinor: batch.priceMinor,
    capacity: batch.capacity,
    registrationDeadline: toIso(batch.registrationDeadline),
    startDate: toIso(batch.startDate),
    endDate: toIso(batch.endDate),
    thumbnail: batch.thumbnail,
    instructors: batch.instructors.map((row) => ({
      id: row.instructor.id,
      name: row.instructor.name,
      avatarUrl: row.instructor.avatarUrl,
    })),
    subjects: batch.subjects.map((subject) => ({
      id: subject.id,
      title: subject.title,
      order: subject.order,
      modules: subject.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        order: mod.order,
        lessons: mod.lessons.map((lesson) => toLessonDto(lesson, includeProtectedFields)),
      })),
    })),
  }
}
