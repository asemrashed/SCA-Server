import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import { BatchStatus, DeliveryMode, EnrollmentStatus } from '../../shared/enums.js'
import { createEnrollmentSchema, reviewEnrollmentSchema } from '../../shared/schemas/enrollment.js'
import { getGrantedSourceBatchIds } from './enrollment.access.js'
import {
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
  instructors: { include: { instructor: { select: { name: true } } } },
  course: {
    include: {
      subjects: {
        orderBy: { order: 'asc' as const },
        include: {
          modules: {
            orderBy: { order: 'asc' as const },
            include: { lessons: lessonOrder },
          },
        },
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
  lessonProgress: true,
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

function allLessonIds(row: EnrollmentWithRelations): string[] {
  if (row.batchId && row.batch) {
    return row.batch.course.subjects.flatMap((s) =>
      s.modules.flatMap((m) => m.lessons.map((l) => l.id)),
    )
  }
  return row.course!.modules.flatMap((m) => m.lessons.map((l) => l.id))
}

async function recomputeProgress(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: enrollmentInclude,
  })
  if (!enrollment) return

  const row = assertEnrollmentRow(enrollment)
  const lessonIds = allLessonIds(row)
  const total = lessonIds.length
  const completed = row.lessonProgress.filter((p) => p.completed).length
  const progressPct = total === 0 ? 0 : Math.round((completed / total) * 100)

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      progressPct,
      ...(progressPct === 100 ? { status: EnrollmentStatus.COMPLETED, completedAt: new Date() } : {}),
    },
  })
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
  return toEnrollmentDetail(row, row.batchId ? await getGrantedSourceBatchIds(row.batchId) : [])
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

export async function markLessonComplete(
  studentId: string,
  lessonId: string,
): Promise<{ progressPct: number }> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  })
  if (!lesson) {
    throw notFound('Lesson not found')
  }

  const module = lesson.module
  let enrollment = null

  if (module.courseId) {
    enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId: module.courseId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
    })
  } else if (module.subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: module.subjectId } })
    if (subject) {
      enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId,
          batch: { courseId: subject.courseId },
          status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
        },
      })
    }
  }

  if (!enrollment) {
    throw forbidden('Not enrolled in this content')
  }

  await prisma.lessonProgress.upsert({
    where: {
      enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
    },
    create: {
      enrollmentId: enrollment.id,
      lessonId,
      completed: true,
      completedAt: new Date(),
    },
    update: {
      completed: true,
      completedAt: new Date(),
    },
  })

  await recomputeProgress(enrollment.id)

  const updated = await prisma.enrollment.findUnique({ where: { id: enrollment.id } })
  return { progressPct: updated?.progressPct ?? 0 }
}

type DbClient = typeof prisma | Prisma.TransactionClient

/** @deprecated Enrollment activation is manual via admin approval. Kept for legacy payment webhook only. */
export async function activateEnrollmentAfterPayment(
  enrollmentId: string,
  db: DbClient = prisma,
): Promise<void> {
  const enrollment = await db.enrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment || enrollment.status !== EnrollmentStatus.PENDING) {
    return
  }

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.ACTIVE },
  })
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

export async function listAdminEnrollmentRequests(
  status: EnrollmentStatus = EnrollmentStatus.PENDING,
): Promise<AdminEnrollmentRequestDto[]> {
  const rows = await prisma.enrollment.findMany({
    where: { status },
    include: adminEnrollmentInclude,
    orderBy: { enrolledAt: 'desc' },
  })
  return rows.map((row) => toAdminEnrollmentRequest(row))
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
