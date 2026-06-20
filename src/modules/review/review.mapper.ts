import type { Prisma } from '@prisma/client'
import type { ReviewStatus } from '../../shared/enums.js'

export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude
}>

export const reviewInclude = {
  student: { select: { id: true, name: true, avatarUrl: true } },
  course: { select: { id: true, title: true } },
  batch: { select: { id: true, title: true } },
} satisfies Prisma.ReviewInclude

export interface ReviewPublicDto {
  id: string
  text: string
  createdAt: string
  studentName: string
  studentAvatarUrl: string | null
  courseTitle: string
  batchTitle: string | null
}

export interface ReviewStudentDto extends ReviewPublicDto {
  courseId: string
  batchId: string | null
  enrollmentId: string | null
  status: ReviewStatus
  reviewedAt: string | null
}

export interface ReviewAdminDto extends ReviewStudentDto {
  studentId: string
  studentPhone: string
}

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function toReviewPublic(row: ReviewWithRelations): ReviewPublicDto {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
    studentName: row.student.name,
    studentAvatarUrl: row.student.avatarUrl,
    courseTitle: row.course.title,
    batchTitle: row.batch?.title ?? null,
  }
}

export function toReviewStudent(row: ReviewWithRelations): ReviewStudentDto {
  return {
    ...toReviewPublic(row),
    courseId: row.courseId,
    batchId: row.batchId,
    enrollmentId: row.enrollmentId,
    status: row.status as ReviewStatus,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  }
}

export function toReviewAdmin(row: ReviewWithRelations): ReviewAdminDto {
  return {
    ...toReviewStudent(row),
    studentId: row.student.id,
    studentPhone: (row.student as { phone?: string }).phone ?? '',
  }
}

export { studentInitials }
