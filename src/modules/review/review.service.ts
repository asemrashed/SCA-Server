import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import { EnrollmentStatus, ReviewStatus } from '../../shared/enums.js'
import type {
  CreateReviewInput,
  ListAdminReviewsQuery,
  ListPublicReviewsQuery,
  ModerateReviewInput,
} from '../../shared/schemas/review.js'
import {
  reviewInclude,
  toReviewAdmin,
  toReviewPublic,
  toReviewStudent,
  type ReviewAdminDto,
  type ReviewPublicDto,
  type ReviewStudentDto,
} from './review.mapper.js'

function periodStart(period: ListAdminReviewsQuery['period']): Date | undefined {
  if (period === 'all') return undefined
  const now = new Date()
  if (period === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return start
  }
  const start = new Date(now)
  start.setMonth(start.getMonth() - 1)
  return start
}

async function assertActiveEnrollment(
  studentId: string,
  courseId: string,
  batchId?: string,
  enrollmentId?: string,
): Promise<{ enrollmentId: string | null; batchId: string | null }> {
  const enrollment = enrollmentId
    ? await prisma.enrollment.findFirst({
        where: {
          id: enrollmentId,
          studentId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          batch: { select: { id: true, courseId: true } },
          course: { select: { id: true } },
        },
      })
    : await prisma.enrollment.findFirst({
        where: {
          studentId,
          status: EnrollmentStatus.ACTIVE,
          OR: [
            { courseId },
            { batch: { courseId } },
          ],
          ...(batchId ? { batchId } : {}),
        },
        include: {
          batch: { select: { id: true, courseId: true } },
          course: { select: { id: true } },
        },
      })

  if (!enrollment) {
    throw forbidden('You must be actively enrolled in this course to leave a review')
  }

  const resolvedCourseId = enrollment.courseId ?? enrollment.batch?.courseId
  if (resolvedCourseId !== courseId) {
    throw validationError('Enrollment does not match the selected course')
  }

  if (batchId && enrollment.batchId !== batchId) {
    throw validationError('Enrollment does not match the selected batch')
  }

  return {
    enrollmentId: enrollment.id,
    batchId: enrollment.batchId,
  }
}

export async function listPublicReviews(
  query: ListPublicReviewsQuery,
): Promise<{ data: ReviewPublicDto[]; meta: { page: number; pageSize: number; total: number } }> {
  const where: Prisma.ReviewWhereInput = {
    status: ReviewStatus.ACTIVE,
    ...(query.courseId ? { courseId: query.courseId } : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.review.count({ where }),
  ])

  return {
    data: rows.map(toReviewPublic),
    meta: { page: query.page, pageSize: query.pageSize, total },
  }
}

export async function listMyReviews(studentId: string): Promise<ReviewStudentDto[]> {
  const rows = await prisma.review.findMany({
    where: { studentId },
    include: reviewInclude,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toReviewStudent)
}

export async function createOrUpdateReview(
  studentId: string,
  input: CreateReviewInput,
): Promise<ReviewStudentDto> {
  const enrollment = await assertActiveEnrollment(
    studentId,
    input.courseId,
    input.batchId,
    input.enrollmentId,
  )

  const existing = await prisma.review.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId: input.courseId,
      },
    },
  })

  if (existing && existing.status === ReviewStatus.ACTIVE) {
    throw conflict('You already have an approved review for this course')
  }

  const row = existing
    ? await prisma.review.update({
        where: { id: existing.id },
        data: {
          text: input.text,
          batchId: enrollment.batchId,
          enrollmentId: enrollment.enrollmentId,
          status: ReviewStatus.PENDING,
          reviewedAt: null,
          reviewedById: null,
        },
        include: reviewInclude,
      })
    : await prisma.review.create({
        data: {
          studentId,
          courseId: input.courseId,
          batchId: enrollment.batchId,
          enrollmentId: enrollment.enrollmentId,
          text: input.text,
          status: ReviewStatus.PENDING,
        },
        include: reviewInclude,
      })

  return toReviewStudent(row)
}

export async function listAdminReviews(
  query: ListAdminReviewsQuery,
): Promise<{ data: ReviewAdminDto[]; meta: { page: number; pageSize: number; total: number } }> {
  const createdAt = periodStart(query.period)
  const where: Prisma.ReviewWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(query.batchId ? { batchId: query.batchId } : {}),
    ...(createdAt ? { createdAt: { gte: createdAt } } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        ...reviewInclude,
        student: { select: { id: true, name: true, avatarUrl: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.review.count({ where }),
  ])

  return {
    data: rows.map(toReviewAdmin),
    meta: { page: query.page, pageSize: query.pageSize, total },
  }
}

export async function moderateReview(
  adminId: string,
  reviewId: string,
  input: ModerateReviewInput,
): Promise<ReviewAdminDto> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!existing) throw notFound('Review not found')

  const status =
    input.action === 'activate' ? ReviewStatus.ACTIVE : ReviewStatus.HIDDEN

  const row = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: adminId,
    },
    include: {
      ...reviewInclude,
      student: { select: { id: true, name: true, avatarUrl: true, phone: true } },
    },
  })

  return toReviewAdmin(row)
}

export async function deleteReview(reviewId: string): Promise<void> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!existing) throw notFound('Review not found')
  await prisma.review.delete({ where: { id: reviewId } })
}
