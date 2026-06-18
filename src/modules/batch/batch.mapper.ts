import type { Batch, BatchInstructor, Course, User } from '@prisma/client'
import type { BatchStatus } from '../../shared/enums.js'
import { parseFaq, type CourseFaqItem } from '../course/course.mapper.js'

type InstructorRow = BatchInstructor & { instructor: Pick<User, 'id' | 'name' | 'avatarUrl'> }
type CourseSummary = Pick<Course, 'id' | 'title' | 'slug' | 'deliveryMode' | 'description' | 'faq'>
type CourseListSummary = Pick<Course, 'id' | 'title' | 'slug' | 'deliveryMode'>
type CourseWithCategory = CourseListSummary & {
  category?: { title: string } | null
}
type BatchWithCourse = Batch & {
  course?: CourseWithCategory | null
}

export interface BatchListItem {
  id: string
  title: string
  slug: string
  courseId: string
  courseTitle: string | null
  courseCategory: string | null
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

export interface BatchCourseSummaryDto {
  id: string
  title: string
  slug: string
  deliveryMode: string
  description: string | null
  faq: CourseFaqItem[]
}

export interface BatchDetailDto {
  id: string
  title: string
  slug: string
  courseId: string
  course: BatchCourseSummaryDto
  status: BatchStatus
  priceMinor: number
  capacity: number | null
  registrationDeadline: string | null
  startDate: string | null
  endDate: string | null
  thumbnail: string | null
  instructors: BatchInstructorDto[]
}

type BatchWithRelations = Batch & {
  course: CourseSummary
  instructors: InstructorRow[]
}

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

export function toBatchListItem(batch: BatchWithCourse): BatchListItem {
  return {
    id: batch.id,
    title: batch.title,
    slug: batch.slug,
    courseId: batch.courseId,
    courseTitle: batch.course?.title ?? null,
    courseCategory: batch.course?.category?.title ?? null,
    status: batch.status as BatchStatus,
    priceMinor: batch.priceMinor,
    capacity: batch.capacity,
    registrationDeadline: toIso(batch.registrationDeadline),
    startDate: toIso(batch.startDate),
    endDate: toIso(batch.endDate),
    thumbnail: batch.thumbnail,
  }
}

export function toBatchDetail(batch: BatchWithRelations): BatchDetailDto {
  return {
    id: batch.id,
    title: batch.title,
    slug: batch.slug,
    courseId: batch.courseId,
    course: {
      id: batch.course.id,
      title: batch.course.title,
      slug: batch.course.slug,
      deliveryMode: batch.course.deliveryMode,
      description: batch.course.description,
      faq: parseFaq(batch.course.faq),
    },
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
  }
}
