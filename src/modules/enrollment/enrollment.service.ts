import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import { BatchStatus, EnrollmentStatus } from '../../shared/enums.js'
import { createEnrollmentSchema } from '../../shared/schemas/enrollment.js'
import {
  toEnrollmentDetail,
  toEnrollmentListItem,
  type EnrollmentDetailDto,
  type EnrollmentListItemDto,
  type EnrollmentWithRelations,
} from './enrollment.mapper.js'

type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>

const lessonOrder = { orderBy: { order: 'asc' as const } }

const batchContentInclude = {
  instructors: { include: { instructor: { select: { name: true } } } },
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
    return row.batch.subjects.flatMap((s) => s.modules.flatMap((m) => m.lessons.map((l) => l.id)))
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
  return toEnrollmentDetail(row)
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
      throw conflict('Already enrolled in this batch')
    }

    const status =
      batch.priceMinor === 0 ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING

    const enrollment = await prisma.enrollment.create({
      data: { studentId, batchId: input.batchId, status },
      include: enrollmentInclude,
    })
    return toEnrollmentListItem(assertEnrollmentRow(enrollment))
  }

  const course = await prisma.course.findFirst({
    where: { id: input.courseId!, deletedAt: null, isPublished: true },
  })
  if (!course) {
    throw notFound('Course not found')
  }

  const existing = await prisma.enrollment.findFirst({
    where: { studentId, courseId: input.courseId },
  })
  if (existing) {
    throw conflict('Already enrolled in this course')
  }

  const status =
    course.priceMinor === 0 ? EnrollmentStatus.ACTIVE : EnrollmentStatus.PENDING

  const enrollment = await prisma.enrollment.create({
    data: { studentId, courseId: input.courseId!, status },
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
          batchId: subject.batchId,
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

/** Called only from verified payment webhook — activates a pending enrollment. */
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
