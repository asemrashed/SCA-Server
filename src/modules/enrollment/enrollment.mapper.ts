import type {
  Batch,
  Course,
  Enrollment,
  Lesson,
  Module,
  Subject,
  User,
} from '@prisma/client'
import { DeliveryMode, EnrollmentKind, EnrollmentStatus, LessonType } from '../../shared/enums.js'

type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type SubjectWithModules = Subject & { modules: ModuleWithLessons[] }

type BatchEnrollmentRow = Enrollment & {
  batch: Batch & {
    course: Pick<Course, 'id' | 'title'>
    subjects: SubjectWithModules[]
  }
  course: null
}

type CourseEnrollmentRow = Enrollment & {
  course: Course & { modules: ModuleWithLessons[] }
  batch: null
}

export type EnrollmentWithRelations = BatchEnrollmentRow | CourseEnrollmentRow

export interface EnrollmentListItemDto {
  id: string
  kind: EnrollmentKind
  deliveryMode: DeliveryMode
  batch: {
    id: string
    title: string
    thumbnail: string | null
    course: { id: string; title: string }
  } | null
  course: {
    id: string
    title: string
    thumbnail: string | null
  } | null
  status: EnrollmentStatus
  rollNumber: string | null
}

export interface EnrollmentLessonDto {
  id: string
  title: string
  type: LessonType
  videoUrl: string | null
  durationS: number | null
  lectureDate: string | null
  order: number
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
  deliveryMode: DeliveryMode
  status: EnrollmentStatus
  rollNumber: string | null
  batch: { id: string; title: string; courseId: string } | null
  course: { id: string; title: string } | null
  subjects?: EnrollmentSubjectDto[]
  grantedSubjects?: EnrollmentSubjectDto[]
  modules?: EnrollmentModuleDto[]
  grantedBatchIds?: string[]
  isAccessBlocked: boolean
}

export interface AdminEnrollmentRequestDto {
  id: string
  kind: EnrollmentKind
  status: EnrollmentStatus
  rollNumber: string | null
  enrolledAt: string
  student: { id: string; name: string; phone: string }
  batch: { id: string; title: string } | null
  course: { id: string; title: string } | null
  totalSeats: number | null
  totalEnrollments: number
}

function flattenSubjectLessons(subjects: SubjectWithModules[]): LessonRow[] {
  return subjects.flatMap((s) => s.modules.flatMap((m) => m.lessons))
}

function flattenCourseLessons(modules: ModuleWithLessons[]): LessonRow[] {
  return modules.flatMap((m) => m.lessons)
}

function formatLectureDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toLessonDto(lesson: LessonRow): EnrollmentLessonDto {
  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type as LessonType,
    videoUrl: lesson.videoUrl,
    durationS: lesson.durationS,
    lectureDate: lesson.lectureDate ? formatLectureDate(lesson.lectureDate) : null,
    order: lesson.order,
  }
}

export function mapSubjectsToEnrollmentDto(
  subjects: SubjectWithModules[],
): EnrollmentSubjectDto[] {
  return subjects.map((subject) => ({
    id: subject.id,
    title: subject.title,
    order: subject.order,
    modules: subject.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: mod.lessons.map((l) => toLessonDto(l)),
    })),
  }))
}

export function toEnrollmentListItem(row: EnrollmentWithRelations): EnrollmentListItemDto {
  if (row.batchId && row.batch) {
    return {
      id: row.id,
      kind: EnrollmentKind.BATCH,
      deliveryMode: DeliveryMode.LIVE,
      batch: {
        id: row.batch.id,
        title: row.batch.title,
        thumbnail: row.batch.thumbnail,
        course: { id: row.batch.course.id, title: row.batch.course.title },
      },
      course: null,
      status: row.status as EnrollmentStatus,
      rollNumber: row.rollNumber,
    }
  }

  return {
    id: row.id,
    kind: EnrollmentKind.COURSE,
    deliveryMode: DeliveryMode.RECORDED,
    batch: null,
    course: {
      id: row.course!.id,
      title: row.course!.title,
      thumbnail: row.course!.thumbnail,
    },
    status: row.status as EnrollmentStatus,
    rollNumber: row.rollNumber,
  }
}

export function toEnrollmentDetail(
  row: EnrollmentWithRelations,
  grantedBatchIds: string[] = [],
  grantedSubjects: EnrollmentSubjectDto[] = [],
  isAccessBlocked = false,
): EnrollmentDetailDto {
  if (row.batchId && row.batch) {
    return {
      id: row.id,
      kind: EnrollmentKind.BATCH,
      deliveryMode: DeliveryMode.LIVE,
      status: row.status as EnrollmentStatus,
      rollNumber: row.rollNumber,
      batch: {
        id: row.batch.id,
        title: row.batch.title,
        courseId: row.batch.courseId,
      },
      course: null,
      subjects: mapSubjectsToEnrollmentDto(row.batch.subjects),
      grantedSubjects: grantedSubjects.length ? grantedSubjects : undefined,
      grantedBatchIds: grantedBatchIds.length ? grantedBatchIds : undefined,
      isAccessBlocked,
    }
  }

  return {
    id: row.id,
    kind: EnrollmentKind.COURSE,
    deliveryMode: DeliveryMode.RECORDED,
    status: row.status as EnrollmentStatus,
    rollNumber: row.rollNumber,
    batch: null,
    course: { id: row.course!.id, title: row.course!.title },
    modules: row.course!.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: mod.lessons.map((l) => toLessonDto(l)),
    })),
    isAccessBlocked,
  }
}

type AdminEnrollmentRow = Enrollment & {
  student: Pick<User, 'id' | 'name' | 'phone'>
  batch:
    | (Pick<Batch, 'id' | 'title' | 'capacity'> & {
        _count: { enrollments: number }
      })
    | null
  course:
    | (Pick<Course, 'id' | 'title'> & {
        _count: { enrollments: number }
      })
    | null
}

export function toAdminEnrollmentRequest(row: AdminEnrollmentRow): AdminEnrollmentRequestDto {
  const kind = row.batchId ? EnrollmentKind.BATCH : EnrollmentKind.COURSE
  const totalEnrollments = row.batch?._count.enrollments ?? row.course?._count.enrollments ?? 0
  const totalSeats = row.batch?.capacity ?? null

  return {
    id: row.id,
    kind,
    status: row.status as EnrollmentStatus,
    rollNumber: row.rollNumber,
    enrolledAt: row.enrolledAt.toISOString(),
    student: {
      id: row.student.id,
      name: row.student.name,
      phone: row.student.phone,
    },
    batch: row.batch ? { id: row.batch.id, title: row.batch.title } : null,
    course: row.course ? { id: row.course.id, title: row.course.title } : null,
    totalSeats,
    totalEnrollments,
  }
}
