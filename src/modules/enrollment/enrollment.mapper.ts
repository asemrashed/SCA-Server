import type {
  Batch,
  BatchInstructor,
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Module,
  Subject,
  User,
} from '@prisma/client'
import { EnrollmentKind, EnrollmentStatus, LessonType } from '../../shared/enums.js'

type ProgressRow = LessonProgress
type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type SubjectWithModules = Subject & { modules: ModuleWithLessons[] }
type InstructorRow = BatchInstructor & { instructor: Pick<User, 'name'> }

type BatchEnrollmentRow = Enrollment & {
  batch: Batch & {
    instructors: InstructorRow[]
    subjects: SubjectWithModules[]
  }
  course: null
  lessonProgress: ProgressRow[]
}

type CourseEnrollmentRow = Enrollment & {
  course: Course & { modules: ModuleWithLessons[] }
  batch: null
  lessonProgress: ProgressRow[]
}

export type EnrollmentWithRelations = BatchEnrollmentRow | CourseEnrollmentRow

export interface EnrollmentListItemDto {
  id: string
  kind: EnrollmentKind
  batch: {
    id: string
    title: string
    thumbnail: string | null
    instructors: { name: string }[]
  } | null
  course: {
    id: string
    title: string
    thumbnail: string | null
  } | null
  status: EnrollmentStatus
  progressPct: number
  totalLessons: number
  completedLessons: number
  nextLesson: { id: string; title: string } | null
}

export interface EnrollmentLessonDto {
  id: string
  title: string
  type: LessonType
  videoUrl: string | null
  durationS: number | null
  order: number
  completed: boolean
}

export interface EnrollmentModuleDto {
  id: string
  title: string
  order: number
  lessons: EnrollmentLessonDto[]
}

export interface EnrollmentSubjectDto {
  id: string
  title: string
  order: number
  modules: EnrollmentModuleDto[]
}

export interface EnrollmentDetailDto {
  id: string
  kind: EnrollmentKind
  status: EnrollmentStatus
  progressPct: number
  batch: { id: string; title: string } | null
  course: { id: string; title: string } | null
  subjects?: EnrollmentSubjectDto[]
  modules?: EnrollmentModuleDto[]
}

function progressMap(rows: ProgressRow[]): Map<string, boolean> {
  return new Map(rows.map((r) => [r.lessonId, r.completed]))
}

function flattenBatchLessons(subjects: SubjectWithModules[]): LessonRow[] {
  return subjects.flatMap((s) => s.modules.flatMap((m) => m.lessons))
}

function flattenCourseLessons(modules: ModuleWithLessons[]): LessonRow[] {
  return modules.flatMap((m) => m.lessons)
}

function findNextLesson(
  lessons: LessonRow[],
  completed: Map<string, boolean>,
): { id: string; title: string } | null {
  const sorted = [...lessons].sort((a, b) => a.order - b.order)
  const next = sorted.find((l) => !completed.get(l.id))
  return next ? { id: next.id, title: next.title } : null
}

function countCompleted(lessons: LessonRow[], completed: Map<string, boolean>): number {
  return lessons.filter((l) => completed.get(l.id)).length
}

export function toEnrollmentListItem(row: EnrollmentWithRelations): EnrollmentListItemDto {
  const completed = progressMap(row.lessonProgress)

  if (row.batchId && row.batch) {
    const lessons = flattenBatchLessons(row.batch.subjects)
    const done = countCompleted(lessons, completed)
    return {
      id: row.id,
      kind: EnrollmentKind.BATCH,
      batch: {
        id: row.batch.id,
        title: row.batch.title,
        thumbnail: row.batch.thumbnail,
        instructors: row.batch.instructors.map((i) => ({ name: i.instructor.name })),
      },
      course: null,
      status: row.status as EnrollmentStatus,
      progressPct: row.progressPct,
      totalLessons: lessons.length,
      completedLessons: done,
      nextLesson: findNextLesson(lessons, completed),
    }
  }

  const lessons = flattenCourseLessons(row.course!.modules)
  const done = countCompleted(lessons, completed)
  return {
    id: row.id,
    kind: EnrollmentKind.COURSE,
    batch: null,
    course: {
      id: row.course!.id,
      title: row.course!.title,
      thumbnail: row.course!.thumbnail,
    },
    status: row.status as EnrollmentStatus,
    progressPct: row.progressPct,
    totalLessons: lessons.length,
    completedLessons: done,
    nextLesson: findNextLesson(lessons, completed),
  }
}

function toLessonDto(lesson: LessonRow, completed: Map<string, boolean>): EnrollmentLessonDto {
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type as LessonType,
    videoUrl: lesson.videoUrl,
    durationS: lesson.durationS,
    order: lesson.order,
    completed: completed.get(lesson.id) ?? false,
  }
}

export function toEnrollmentDetail(row: EnrollmentWithRelations): EnrollmentDetailDto {
  const completed = progressMap(row.lessonProgress)

  if (row.batchId && row.batch) {
    return {
      id: row.id,
      kind: EnrollmentKind.BATCH,
      status: row.status as EnrollmentStatus,
      progressPct: row.progressPct,
      batch: { id: row.batch.id, title: row.batch.title },
      course: null,
      subjects: row.batch.subjects.map((subject) => ({
        id: subject.id,
        title: subject.title,
        order: subject.order,
        modules: subject.modules.map((mod) => ({
          id: mod.id,
          title: mod.title,
          order: mod.order,
          lessons: mod.lessons.map((l) => toLessonDto(l, completed)),
        })),
      })),
    }
  }

  return {
    id: row.id,
    kind: EnrollmentKind.COURSE,
    status: row.status as EnrollmentStatus,
    progressPct: row.progressPct,
    batch: null,
    course: { id: row.course!.id, title: row.course!.title },
    modules: row.course!.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: mod.lessons.map((l) => toLessonDto(l, completed)),
    })),
  }
}
