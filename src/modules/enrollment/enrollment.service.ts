import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import { BatchStatus, DeliveryMode, EnrollmentStatus } from '../../shared/enums.js'
import { createEnrollmentSchema, reviewEnrollmentSchema, type ListAdminEnrollmentsQuery } from '../../shared/schemas/enrollment.js'
import { loadSubjectsForBatchIds } from '../batch/batch.curriculum.service.js'
import { getGrantedSourceBatchIds } from './enrollment.access.js'
import { isEnrollmentPaymentBlocked } from '../monthly-payment/monthly-payment.utils.js'
import {
  mapSubjectsToEnrollmentDto,
  toEnrollmentDetail,
  toEnrollmentListItem,
  toAdminEnrollmentRequest,
  type AdminEnrollmentRequestDto,
  type EnrollmentDetailDto,
  type EnrollmentListItemDto,
  type EnrollmentWithRelations,
} from './enrollment.mapper.js'

type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
type ReviewEnrollmentInput = z.infer<typeof reviewEnrollmentSchema>

const lessonOrder = { orderBy: { order: 'asc' as const } }

const batchContentInclude = {
  course: { select: { id: true, title: true } },
  subjects: {
    orderBy: { order: 'asc' as const },
    include: {
      modules: {
        orderBy: { order: 'asc' as const },
        include: { lessons: lessonOrder },
      },
    },
  },
} satisfies Prisma.BatchInclude

const courseContentInclude = {
  modules: {
    orderBy: { order: 'asc' as const },
    include: { lessons: lessonOrder },
  },
} satisfies Prisma.CourseInclude

const enrollmentInclude = {
  batch: { include: batchContentInclude },
  course: { include: courseContentInclude },
} satisfies Prisma.EnrollmentInclude

function assertEnrollmentRow(row: {
  batchId: string | null
  courseId: string | null
  batch: unknown
  course: unknown
}): EnrollmentWithRelations {
  if (row.batchId && row.batch) {
    return row as EnrollmentWithRelations
  }
  if (row.courseId && row.course) {
    return row as EnrollmentWithRelations
  }
  throw notFound('Enrollment not found')
}

async function findEnrollmentForStudent(
  studentId: string,
  enrollmentId: string,
): Promise<EnrollmentWithRelations> {
  const row = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, studentId },
    include: enrollmentInclude,
  })
  if (!row) {
    throw notFound('Enrollment not found')
  }
  return assertEnrollmentRow(row)
}

export async function listMyEnrollments(studentId: string): Promise<EnrollmentListItemDto[]> {
  const rows = await prisma.enrollment.findMany({
    where: { studentId, status: { not: EnrollmentStatus.CANCELLED } },
    include: enrollmentInclude,
    orderBy: { enrolledAt: 'desc' },
  })
  return rows.map((r) => toEnrollmentListItem(assertEnrollmentRow(r)))
}

export async function getMyEnrollment(
  studentId: string,
  enrollmentId: string,
): Promise<EnrollmentDetailDto> {
  const row = await findEnrollmentForStudent(studentId, enrollmentId)
  if (row.status !== EnrollmentStatus.ACTIVE && row.status !== EnrollmentStatus.COMPLETED) {
    throw forbidden('Enrollment is not active')
  }
  const isAccessBlocked = await isEnrollmentPaymentBlocked(row.id, row.batchId)

  const grantedBatchIds = row.batchId ? await getGrantedSourceBatchIds(row.batchId) : []
  const grantedSubjects =
    grantedBatchIds.length > 0
      ? mapSubjectsToEnrollmentDto(await loadSubjectsForBatchIds(grantedBatchIds))
      : []

  return toEnrollmentDetail(row, grantedBatchIds, grantedSubjects, isAccessBlocked)
}

async function handleExistingEnrollment(
  existing: { id: string; status: string },
  include: typeof enrollmentInclude,
): Promise<EnrollmentListItemDto | null> {
  if (existing.status === EnrollmentStatus.CANCELLED) {
    const enrollment = await prisma.enrollment.update({
      where: { id: existing.id },
      data: {
        status: EnrollmentStatus.PENDING,
        rollNumber: null,
        enrolledAt: new Date(),
      },
      include,
    })
    return toEnrollmentListItem(assertEnrollmentRow(enrollment))
  }
  if (existing.status === EnrollmentStatus.PENDING) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: existing.id },
      include,
    })
    if (!enrollment) return null
    return toEnrollmentListItem(assertEnrollmentRow(enrollment))
  }
  return null
}

export async function createEnrollment(
  studentId: string,
  input: CreateEnrollmentInput,
): Promise<EnrollmentListItemDto> {
  if (input.batchId) {
    const batch = await prisma.batch.findFirst({
      where: { id: input.batchId, deletedAt: null },
      include: { _count: { select: { enrollments: true } } },
    })
    if (!batch || batch.status === BatchStatus.DRAFT || batch.status === BatchStatus.CANCELLED) {
      throw notFound('Batch not found')
    }
    if (batch.registrationDeadline && batch.registrationDeadline < new Date()) {
      throw validationError('Registration deadline has passed')
    }
    if (batch.capacity != null && batch._count.enrollments >= batch.capacity) {
      throw conflict('Batch is full')
    }

    const existing = await prisma.enrollment.findFirst({
      where: { studentId, batchId: input.batchId },
    })
    if (existing) {
      const resumed = await handleExistingEnrollment(existing, enrollmentInclude)
      if (resumed) return resumed
      throw conflict('Already enrolled in this batch')
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId, batchId: input.batchId, status: EnrollmentStatus.PENDING },
      include: enrollmentInclude,
    })
    return toEnrollmentListItem(assertEnrollmentRow(enrollment))
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId!,
      deletedAt: null,
      isPublished: true,
      deliveryMode: DeliveryMode.RECORDED,
    },
  })
  if (!course) {
    throw notFound('Course not found')
  }

  const existing = await prisma.enrollment.findFirst({
    where: { studentId, courseId: input.courseId },
  })
  if (existing) {
    const resumed = await handleExistingEnrollment(existing, enrollmentInclude)
    if (resumed) return resumed
    throw conflict('Already enrolled in this course')
  }

  const enrollment = await prisma.enrollment.create({
    data: { studentId, courseId: input.courseId!, status: EnrollmentStatus.PENDING },
    include: enrollmentInclude,
  })
  return toEnrollmentListItem(assertEnrollmentRow(enrollment))
}

const activeEnrollmentStatuses = [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]

const adminEnrollmentInclude = {
  student: { select: { id: true, name: true, phone: true } },
  batch: {
    select: {
      id: true,
      title: true,
      capacity: true,
      _count: {
        select: {
          enrollments: {
            where: { status: { in: activeEnrollmentStatuses } },
          },
        },
      },
    },
  },
  course: {
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          enrollments: {
            where: { status: { in: activeEnrollmentStatuses } },
          },
        },
      },
    },
  },
} satisfies Prisma.EnrollmentInclude

export interface AdminEnrollmentOverviewDto {
  total: number
  pending: number
  active: number
  cancelled: number
  completed: number
}

export async function getAdminEnrollmentOverview(): Promise<AdminEnrollmentOverviewDto> {
  const grouped = await prisma.enrollment.groupBy({
    by: ['status'],
    _count: { _all: true },
  })

  const counts = Object.fromEntries(
    grouped.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<EnrollmentStatus, number>>

  const pending = counts[EnrollmentStatus.PENDING] ?? 0
  const active = counts[EnrollmentStatus.ACTIVE] ?? 0
  const cancelled = counts[EnrollmentStatus.CANCELLED] ?? 0
  const completed = counts[EnrollmentStatus.COMPLETED] ?? 0

  return {
    total: pending + active + cancelled + completed,
    pending,
    active,
    cancelled,
    completed,
  }
}

export async function listAdminEnrollmentRequests(
  query: ListAdminEnrollmentsQuery,
): Promise<{
  data: AdminEnrollmentRequestDto[]
  meta: { total: number; page: number; pageSize: number }
}> {
  const where = query.status ? { status: query.status } : {}
  const skip = (query.page - 1) * query.pageSize

  const [rows, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: adminEnrollmentInclude,
      orderBy: { enrolledAt: 'desc' },
      skip,
      take: query.pageSize,
    }),
    prisma.enrollment.count({ where }),
  ])

  return {
    data: rows.map((row) => toAdminEnrollmentRequest(row)),
    meta: { total, page: query.page, pageSize: query.pageSize },
  }
}

export async function reviewEnrollmentRequest(
  enrollmentId: string,
  input: ReviewEnrollmentInput,
): Promise<AdminEnrollmentRequestDto> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: adminEnrollmentInclude,
  })
  if (!enrollment) {
    throw notFound('Enrollment not found')
  }
  if (enrollment.status !== EnrollmentStatus.PENDING) {
    throw validationError('Only pending enrollment requests can be reviewed')
  }

  if (input.action === 'reject') {
    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.CANCELLED },
      include: adminEnrollmentInclude,
    })
    return toAdminEnrollmentRequest(updated)
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.ACTIVE,
      rollNumber: input.rollNumber!,
    },
    include: adminEnrollmentInclude,
  })
  return toAdminEnrollmentRequest(updated)
}
