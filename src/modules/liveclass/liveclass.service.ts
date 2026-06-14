import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { forbidden, notFound, validationError } from '../../lib/errors.js'
import {
  AttendanceStatus,
  EnrollmentStatus,
  Role,
  SessionStatus,
} from '../../shared/enums.js'
import { isAdminStaff, isStaff } from '../../shared/roles.js'
import type {
  createRecordingSchema,
  createSessionSchema,
  markAttendanceSchema,
  updateSessionSchema,
} from '../../shared/schemas/liveclass.js'
import {
  toAttendanceSummary,
  toLiveSessionDto,
  toRecordingDto,
  type AttendanceSummaryDto,
  type LiveSessionDto,
  type RecordingDto,
} from './liveclass.mapper.js'

type CreateSessionInput = z.infer<typeof createSessionSchema>
type UpdateSessionInput = z.infer<typeof updateSessionSchema>
type CreateRecordingInput = z.infer<typeof createRecordingSchema>
type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>

const sessionInclude = { recording: true } as const

async function isBatchInstructor(batchId: string, userId: string): Promise<boolean> {
  const row = await prisma.batchInstructor.findUnique({
    where: { batchId_instructorId: { batchId, instructorId: userId } },
  })
  return !!row
}

async function isEnrolledInBatch(studentId: string, batchId: string): Promise<boolean> {
  const row = await prisma.enrollment.findFirst({
    where: {
      studentId,
      batchId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    },
  })
  return !!row
}

async function isEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
  const row = await prisma.enrollment.findFirst({
    where: {
      studentId,
      courseId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    },
  })
  return !!row
}

async function assertBatchSessionAccess(
  userId: string,
  role: Role,
  batchId: string,
): Promise<void> {
  if (isAdminStaff(role)) return
  if (role === Role.INSTRUCTOR && (await isBatchInstructor(batchId, userId))) return
  if (role === Role.STUDENT && (await isEnrolledInBatch(userId, batchId))) return
  throw forbidden('Not allowed to access this batch')
}

async function assertCourseSessionAccess(
  userId: string,
  role: Role,
  courseId: string,
): Promise<void> {
  if (isAdminStaff(role)) return
  if (role === Role.INSTRUCTOR) return
  if (role === Role.STUDENT && (await isEnrolledInCourse(userId, courseId))) return
  throw forbidden('Not allowed to access this course')
}

async function assertBatchEnrolled(studentId: string, batchId: string): Promise<void> {
  if (!(await isEnrolledInBatch(studentId, batchId))) {
    throw forbidden('Enrollment required')
  }
}

async function assertCourseEnrolled(studentId: string, courseId: string): Promise<void> {
  if (!(await isEnrolledInCourse(studentId, courseId))) {
    throw forbidden('Enrollment required')
  }
}

async function assertCanManageBatch(userId: string, role: Role, batchId: string): Promise<void> {
  if (isAdminStaff(role)) return
  if (role === Role.INSTRUCTOR && (await isBatchInstructor(batchId, userId))) return
  throw forbidden('Not allowed to manage this batch')
}

async function assertCanManageCourse(userId: string, role: Role): Promise<void> {
  if (isStaff(role)) return
  throw forbidden('Not allowed to manage course sessions')
}

async function getSessionOrThrow(sessionId: string) {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  })
  if (!session) {
    throw notFound('Session not found')
  }
  return session
}

export async function listBatchSessions(
  userId: string,
  role: Role,
  batchId: string,
): Promise<LiveSessionDto[]> {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, deletedAt: null } })
  if (!batch) {
    throw notFound('Batch not found')
  }
  await assertBatchSessionAccess(userId, role, batchId)

  const sessions = await prisma.liveSession.findMany({
    where: { batchId },
    include: sessionInclude,
    orderBy: { scheduledAt: 'desc' },
  })
  return sessions.map(toLiveSessionDto)
}

export async function listCourseSessions(
  userId: string,
  role: Role,
  courseId: string,
): Promise<LiveSessionDto[]> {
  const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } })
  if (!course) {
    throw notFound('Course not found')
  }
  await assertCourseSessionAccess(userId, role, courseId)

  const sessions = await prisma.liveSession.findMany({
    where: { courseId },
    include: sessionInclude,
    orderBy: { scheduledAt: 'desc' },
  })
  return sessions.map(toLiveSessionDto)
}

export async function createSession(
  userId: string,
  role: Role,
  input: CreateSessionInput,
): Promise<LiveSessionDto> {
  if (input.batchId) {
    const batch = await prisma.batch.findFirst({ where: { id: input.batchId, deletedAt: null } })
    if (!batch) {
      throw notFound('Batch not found')
    }
    await assertCanManageBatch(userId, role, input.batchId)
  } else {
    const course = await prisma.course.findFirst({
      where: { id: input.courseId!, deletedAt: null },
    })
    if (!course) {
      throw notFound('Course not found')
    }
    await assertCanManageCourse(userId, role)
  }

  const session = await prisma.liveSession.create({
    data: {
      batchId: input.batchId ?? null,
      courseId: input.courseId ?? null,
      title: input.title,
      scheduledAt: input.scheduledAt,
      joinUrl: input.joinUrl ?? null,
    },
    include: sessionInclude,
  })
  return toLiveSessionDto(session)
}

export async function updateSession(
  userId: string,
  role: Role,
  sessionId: string,
  input: UpdateSessionInput,
): Promise<LiveSessionDto> {
  const existing = await getSessionOrThrow(sessionId)

  if (existing.batchId) {
    await assertCanManageBatch(userId, role, existing.batchId)
  } else if (existing.courseId) {
    await assertCanManageCourse(userId, role)
  }

  const updateData: {
    title?: string
    status?: SessionStatus
    joinUrl?: string | null
    scheduledAt?: Date
    startedAt?: Date | null
    endedAt?: Date | null
  } = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.status !== undefined) updateData.status = input.status
  if (input.joinUrl !== undefined) updateData.joinUrl = input.joinUrl
  if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt
  if (input.startedAt !== undefined) updateData.startedAt = input.startedAt
  if (input.endedAt !== undefined) updateData.endedAt = input.endedAt

  if (input.status === SessionStatus.LIVE && input.startedAt === undefined && !existing.startedAt) {
    updateData.startedAt = new Date()
  }
  if (input.status === SessionStatus.ENDED && input.endedAt === undefined && !existing.endedAt) {
    updateData.endedAt = new Date()
  }

  const session = await prisma.liveSession.update({
    where: { id: sessionId },
    data: updateData,
    include: sessionInclude,
  })
  return toLiveSessionDto(session)
}

export async function listBatchRecordings(
  studentId: string,
  batchId: string,
): Promise<RecordingDto[]> {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, deletedAt: null } })
  if (!batch) {
    throw notFound('Batch not found')
  }
  await assertBatchEnrolled(studentId, batchId)

  const recordings = await prisma.recording.findMany({
    where: { batchId },
    orderBy: { createdAt: 'desc' },
  })
  return recordings.map(toRecordingDto)
}

export async function listCourseRecordings(
  studentId: string,
  courseId: string,
): Promise<RecordingDto[]> {
  const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } })
  if (!course) {
    throw notFound('Course not found')
  }
  await assertCourseEnrolled(studentId, courseId)

  const recordings = await prisma.recording.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
  })
  return recordings.map(toRecordingDto)
}

export async function createRecording(
  userId: string,
  role: Role,
  input: CreateRecordingInput,
): Promise<RecordingDto> {
  let batchId = input.batchId ?? null
  let courseId = input.courseId ?? null

  if (input.sessionId) {
    const session = await getSessionOrThrow(input.sessionId)
    if (session.batchId) {
      await assertCanManageBatch(userId, role, session.batchId)
      batchId = session.batchId
      courseId = null
    } else if (session.courseId) {
      await assertCanManageCourse(userId, role)
      courseId = session.courseId
      batchId = null
    }
    if (session.recording) {
      throw validationError('This session already has a recording')
    }
  } else if (batchId) {
    const batch = await prisma.batch.findFirst({ where: { id: batchId, deletedAt: null } })
    if (!batch) {
      throw notFound('Batch not found')
    }
    await assertCanManageBatch(userId, role, batchId)
  } else if (courseId) {
    const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } })
    if (!course) {
      throw notFound('Course not found')
    }
    await assertCanManageCourse(userId, role)
  } else {
    throw validationError('Provide sessionId or exactly one of batchId / courseId')
  }

  if (input.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      include: { module: true },
    })
    if (!lesson) {
      throw notFound('Lesson not found')
    }
  }

  const recording = await prisma.recording.create({
    data: {
      batchId,
      courseId,
      lessonId: input.lessonId ?? null,
      sessionId: input.sessionId ?? null,
      title: input.title,
      videoUrl: input.videoUrl,
      durationS: input.durationS ?? null,
    },
  })
  return toRecordingDto(recording)
}

export async function markSessionAttendance(
  userId: string,
  role: Role,
  sessionId: string,
  marks: MarkAttendanceInput,
): Promise<{ marked: number }> {
  const session = await getSessionOrThrow(sessionId)
  if (!session.batchId) {
    throw validationError('Attendance is only supported for batch sessions')
  }
  await assertCanManageBatch(userId, role, session.batchId)

  const studentIds = marks.map((m) => m.studentId)
  const enrolled = await prisma.enrollment.findMany({
    where: {
      batchId: session.batchId,
      studentId: { in: studentIds },
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    },
    select: { studentId: true },
  })
  const enrolledSet = new Set(enrolled.map((e) => e.studentId))
  for (const mark of marks) {
    if (!enrolledSet.has(mark.studentId)) {
      throw validationError(`Student ${mark.studentId} is not enrolled in this batch`)
    }
  }

  await prisma.$transaction(
    marks.map((mark) =>
      prisma.attendance.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: mark.studentId },
        },
        create: {
          sessionId,
          studentId: mark.studentId,
          status: mark.status,
        },
        update: {
          status: mark.status,
          markedAt: new Date(),
        },
      }),
    ),
  )

  return { marked: marks.length }
}

export async function getMyAttendance(studentId: string): Promise<AttendanceSummaryDto[]> {
  const rows = await prisma.attendance.findMany({
    where: { studentId },
    include: {
      session: { include: { batch: { select: { id: true, title: true } } } },
    },
    orderBy: { markedAt: 'desc' },
  })

  return rows
    .filter((row) => row.session.batch)
    .map((row) =>
      toAttendanceSummary({
        ...row,
        session: { ...row.session, batch: row.session.batch! },
      }),
    )
}
