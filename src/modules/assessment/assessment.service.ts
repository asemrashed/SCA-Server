import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import { AttemptStatus, DeliveryMode, EnrollmentStatus, ExamStatus, QuestionType, Role } from '../../shared/enums.js'
import { isAdminStaff, isStaff } from '../../shared/roles.js'
import {
  assertStudentCourseContentAccess,
} from '../enrollment/enrollment.access.js'
import type {
  createAssignmentSchema,
  createExamSchema,
  createPdfQuestionsBulkSchema,
  createQuestionSchema,
  createSubmissionSchema,
  gradeSubmissionSchema,
  questionListQuerySchema,
  updateAttemptSchema,
} from '../../shared/schemas/assessment.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  toAssignmentListItem,
  toExamAttemptDto,
  toExamDetail,
  toExamListItem,
  toQuestionDto,
  toSubmissionDto,
  type AssignmentListItemDto,
  type ExamAttemptDto,
  type ExamDetailDto,
  type ExamListItemDto,
  type QuestionDto,
  type SubmissionDto,
} from './assessment.mapper.js'

type QuestionListQuery = z.infer<typeof questionListQuerySchema>
type CreateQuestionInput = z.infer<typeof createQuestionSchema>
type CreatePdfQuestionsBulkInput = z.infer<typeof createPdfQuestionsBulkSchema>
type CreateExamInput = z.infer<typeof createExamSchema>
type UpdateAttemptInput = z.infer<typeof updateAttemptSchema>
type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>
type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>

const examInclude = {
  questions: {
    orderBy: { order: 'asc' as const },
    include: { question: true },
  },
} satisfies Prisma.ExamInclude

function includeCorrectForRole(role: Role): boolean {
  return isStaff(role)
}

async function assertCourseContentAccess(
  userId: string,
  role: Role,
  courseId: string,
): Promise<void> {
  if (isStaff(role)) {
    if (role === Role.INSTRUCTOR) {
      const assigned = await prisma.batchInstructor.findFirst({
        where: { instructorId: userId, batch: { courseId } },
      })
      if (!assigned && !isAdminStaff(role)) {
        throw forbidden('Not assigned to this course')
      }
    }
    return
  }
  await assertStudentCourseContentAccess(userId, courseId)
}

async function assertModuleLessonsComplete(
  studentId: string,
  moduleId: string,
  courseId: string,
): Promise<void> {
  const module = await prisma.module.findFirst({
    where: {
      id: moduleId,
      OR: [{ courseId }, { subject: { batch: { courseId } } }],
    },
    include: { lessons: { select: { id: true } } },
  })
  if (!module) {
    throw validationError('Invalid module for course exam')
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      OR: [{ courseId }, { batch: { courseId } }],
    },
    include: {
      lessonProgress: {
        where: { completed: true },
        select: { lessonId: true },
      },
    },
  })
  if (!enrollment) {
    throw forbidden('Not enrolled in this course')
  }

  const completedIds = new Set(enrollment.lessonProgress.map((p) => p.lessonId))
  const incomplete = module.lessons.filter((l) => !completedIds.has(l.id))
  if (incomplete.length > 0) {
    throw forbidden('Complete all lessons in this module before taking the exam')
  }
}

function normalizeAnswer(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value).trim().toLowerCase()
}

function scoreAnswer(
  type: QuestionType,
  correct: unknown,
  answer: unknown,
): boolean {
  if (type === QuestionType.WRITTEN) return false
  if (type === QuestionType.MCQ) {
    return normalizeAnswer(correct) === normalizeAnswer(answer)
  }
  if (type === QuestionType.TRUE_FALSE) {
    return normalizeAnswer(correct) === normalizeAnswer(answer)
  }
  if (type === QuestionType.SHORT_ANSWER) {
    return normalizeAnswer(correct) === normalizeAnswer(answer)
  }
  return false
}

function computeExamScore(
  questions: {
    questionId: string
    marks: number | null
    question: { type: string; marks: number; correct: unknown }
  }[],
  answers: Record<string, unknown>,
): { scoreMarks: number; scorePct: number; totalMarks: number } {
  let earned = 0
  let total = 0
  for (const row of questions) {
    const marks = row.marks ?? row.question.marks
    if (row.question.type === QuestionType.WRITTEN) continue
    total += marks
    const answer = answers[row.questionId]
    if (scoreAnswer(row.question.type as QuestionType, row.question.correct, answer)) {
      earned += marks
    }
  }
  const scorePct = total === 0 ? 0 : Math.round((earned / total) * 100)
  return { scoreMarks: earned, scorePct, totalMarks: total }
}

function assertExamWindow(exam: { opensAt: Date | null; closesAt: Date | null }): void {
  const now = new Date()
  if (exam.opensAt && now < exam.opensAt) {
    throw forbidden('Exam has not opened yet')
  }
  if (exam.closesAt && now > exam.closesAt) {
    throw forbidden('Exam has closed')
  }
}

export async function listQuestions(
  query: QuestionListQuery,
): Promise<ApiListResponse<QuestionDto>> {
  const { page, pageSize, search, category, type, batchId, subjectId, moduleId, sort } = query
  const where: Prisma.QuestionWhereInput = {
    ...(category ? { category } : {}),
    ...(type ? { type } : {}),
    ...(batchId ? { batchId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(moduleId ? { moduleId } : {}),
    ...(search
      ? {
          OR: [
            { stem: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const orderBy: Prisma.QuestionOrderByWithRelationInput =
    sort === 'createdAt:asc'
      ? { createdAt: 'asc' }
      : sort === 'marks:desc'
        ? { marks: 'desc' }
        : { createdAt: 'desc' }

  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ])

  return {
    data: rows.map((q) => toQuestionDto(q, true)),
    meta: { page, pageSize, total },
  }
}

async function validateQuestionPlacement(input: {
  batchId?: string | null
  subjectId?: string | null
  moduleId?: string | null
}): Promise<void> {
  if (!input.batchId) return

  const batch = await prisma.batch.findFirst({
    where: { id: input.batchId, deletedAt: null },
  })
  if (!batch) {
    throw notFound('Batch not found')
  }

  if (input.subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } })
    if (!subject || subject.batchId !== input.batchId) {
      throw validationError('Subject does not belong to this batch')
    }
  }

  if (input.moduleId) {
    const module = await prisma.module.findUnique({ where: { id: input.moduleId } })
    if (!module) {
      throw notFound('Module not found')
    }
    if (module.subjectId && input.subjectId && module.subjectId !== input.subjectId) {
      throw validationError('Chapter does not belong to this subject')
    }
    if (module.subjectId && !input.subjectId) {
      throw validationError('Subject is required when a chapter is selected')
    }
  }
}

export async function createQuestion(input: CreateQuestionInput): Promise<QuestionDto> {
  await validateQuestionPlacement(input)

  const question = await prisma.question.create({
    data: {
      stem: input.stem,
      type: input.type,
      options: input.options ?? undefined,
      correct: (input.type === QuestionType.PDF ? {} : input.correct) as Prisma.InputJsonValue,
      category: input.category ?? null,
      marks: input.marks,
      fileUrl: input.fileUrl ?? null,
      batchId: input.batchId ?? null,
      subjectId: input.subjectId ?? null,
      moduleId: input.moduleId ?? null,
    },
  })
  return toQuestionDto(question, true)
}

export async function createPdfQuestionsBulk(
  input: CreatePdfQuestionsBulkInput,
): Promise<{ data: QuestionDto[] }> {
  await validateQuestionPlacement(input)

  const rows = await prisma.$transaction(
    input.questions.map((item) =>
      prisma.question.create({
        data: {
          stem: item.title,
          type: QuestionType.PDF,
          correct: {},
          marks: item.marks ?? 1,
          fileUrl: item.fileUrl,
          batchId: input.batchId,
          subjectId: input.subjectId,
          moduleId: input.moduleId ?? null,
        },
      }),
    ),
  )

  return { data: rows.map((row) => toQuestionDto(row, true)) }
}

export async function listBatchExams(
  userId: string,
  role: Role,
  batchId: string,
): Promise<{ data: ExamListItemDto[] }> {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, deletedAt: null },
  })
  if (!batch) throw notFound('Batch not found')

  return listCourseExams(userId, role, batch.courseId)
}

export async function listCourseExams(
  userId: string,
  role: Role,
  courseId: string,
): Promise<{ data: ExamListItemDto[] }> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  })
  if (!course) throw notFound('Course not found')

  await assertCourseContentAccess(userId, role, courseId)

  const exams = await prisma.exam.findMany({
    where: {
      courseId,
      ...(isStaff(role) ? {} : { status: ExamStatus.PUBLISHED }),
    },
    include: examInclude,
    orderBy: { createdAt: 'desc' },
  })

  let attemptsByExam = new Map<string, Prisma.ExamAttemptGetPayload<object>>()
  if (role === Role.STUDENT) {
    const attempts = await prisma.examAttempt.findMany({
      where: { studentId: userId, examId: { in: exams.map((e) => e.id) } },
    })
    attemptsByExam = new Map(attempts.map((a) => [a.examId, a]))
  }

  return {
    data: exams.map((exam) =>
      toExamListItem(exam, includeCorrectForRole(role), attemptsByExam.get(exam.id)),
    ),
  }
}

export async function createExam(input: CreateExamInput): Promise<ExamDetailDto> {
  const questions = await prisma.question.findMany({
    where: { id: { in: input.questionIds } },
  })
  if (questions.length !== input.questionIds.length) {
    throw validationError('One or more questions not found')
  }

  const course = await prisma.course.findFirst({
    where: { id: input.courseId, deletedAt: null },
  })
  if (!course) throw notFound('Course not found')

  if (input.moduleId) {
    const module = await prisma.module.findFirst({
      where: {
        id: input.moduleId,
        OR: [{ courseId: input.courseId }, { subject: { batch: { courseId: input.courseId } } }],
      },
    })
    if (!module) throw validationError('moduleId must belong to the course')
  } else if (course.deliveryMode === DeliveryMode.RECORDED) {
    throw validationError('moduleId is required for recorded course exams')
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
  const status = input.status === 'PUBLISHED' ? ExamStatus.PUBLISHED : ExamStatus.DRAFT

  const exam = await prisma.exam.create({
    data: {
      courseId: input.courseId,
      moduleId: input.moduleId ?? null,
      title: input.title,
      durationMin: input.durationMin ?? null,
      totalMarks,
      status,
      questions: {
        create: input.questionIds.map((questionId, index) => ({
          questionId,
          order: index,
          marks: questions.find((q) => q.id === questionId)?.marks ?? null,
        })),
      },
    },
    include: examInclude,
  })

  return toExamDetail(exam, true)
}

export async function startExamAttempt(studentId: string, examId: string): Promise<ExamAttemptDto> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: examInclude,
  })
  if (!exam || exam.status !== ExamStatus.PUBLISHED) {
    throw notFound('Exam not found')
  }

  assertExamWindow(exam)

  await assertStudentCourseContentAccess(studentId, exam.courseId)

  if (exam.moduleId) {
    const course = await prisma.course.findUnique({ where: { id: exam.courseId } })
    if (course?.deliveryMode === DeliveryMode.RECORDED) {
      await assertModuleLessonsComplete(studentId, exam.moduleId, exam.courseId)
    }
  }

  const existing = await prisma.examAttempt.findUnique({
    where: { examId_studentId: { examId, studentId } },
    include: { exam: { include: examInclude } },
  })

  if (existing) {
    if (existing.status === AttemptStatus.SUBMITTED) {
      throw conflict('Exam already submitted')
    }
    return toExamAttemptDto(existing, false)
  }

  const expiresAt =
    exam.durationMin != null
      ? new Date(Date.now() + exam.durationMin * 60 * 1000)
      : null

  const attempt = await prisma.examAttempt.create({
    data: {
      examId,
      studentId,
      expiresAt,
    },
    include: { exam: { include: examInclude } },
  })

  return toExamAttemptDto(attempt, false)
}

export async function updateExamAttempt(
  studentId: string,
  attemptId: string,
  input: UpdateAttemptInput,
): Promise<ExamAttemptDto> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: examInclude } },
  })
  if (!attempt || attempt.studentId !== studentId) {
    throw notFound('Attempt not found')
  }
  if (attempt.status === AttemptStatus.SUBMITTED) {
    throw conflict('Attempt already submitted')
  }

  assertExamWindow(attempt.exam)

  const now = new Date()
  const timedOut = attempt.expiresAt != null && now > attempt.expiresAt
  const shouldSubmit = Boolean(input.submit) || timedOut

  if (shouldSubmit) {
    const mergedAnswers = { ...(attempt.answers as Record<string, unknown>), ...input.answers }
    const { scoreMarks, scorePct } = computeExamScore(attempt.exam.questions, mergedAnswers)

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        answers: mergedAnswers as Prisma.InputJsonValue,
        status: AttemptStatus.SUBMITTED,
        submittedAt: now,
        scoreMarks,
        scorePct,
      },
      include: { exam: { include: examInclude } },
    })
    return toExamAttemptDto(updated, false)
  }

  const updated = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      answers: {
        ...(attempt.answers as Record<string, unknown>),
        ...input.answers,
      } as Prisma.InputJsonValue,
    },
    include: { exam: { include: examInclude } },
  })

  return toExamAttemptDto(updated, false)
}

export async function listBatchAssignments(
  userId: string,
  role: Role,
  batchId: string,
): Promise<{ data: AssignmentListItemDto[] }> {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, deletedAt: null },
  })
  if (!batch) throw notFound('Batch not found')

  return listCourseAssignments(userId, role, batch.courseId)
}

export async function listCourseAssignments(
  userId: string,
  role: Role,
  courseId: string,
): Promise<{ data: AssignmentListItemDto[] }> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  })
  if (!course) throw notFound('Course not found')

  await assertCourseContentAccess(userId, role, courseId)

  const assignments = await prisma.assignment.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
  })

  let submissionsByAssignment = new Map<string, Prisma.SubmissionGetPayload<object>>()
  if (role === Role.STUDENT) {
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: userId,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
    })
    submissionsByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]))
  }

  return {
    data: assignments.map((a) =>
      toAssignmentListItem(a, submissionsByAssignment.get(a.id)),
    ),
  }
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<AssignmentListItemDto> {
  const course = await prisma.course.findFirst({
    where: { id: input.courseId, deletedAt: null },
  })
  if (!course) throw notFound('Course not found')

  if (input.moduleId) {
    const module = await prisma.module.findFirst({
      where: {
        id: input.moduleId,
        OR: [{ courseId: input.courseId }, { subject: { batch: { courseId: input.courseId } } }],
      },
    })
    if (!module) throw validationError('moduleId must belong to the course')
  }

  const assignment = await prisma.assignment.create({
    data: {
      courseId: input.courseId,
      moduleId: input.moduleId ?? null,
      title: input.title,
      description: input.description ?? null,
      totalMarks: input.totalMarks,
      dueAt: input.dueAt ?? null,
    },
  })

  return toAssignmentListItem(assignment)
}

export async function submitAssignment(
  studentId: string,
  assignmentId: string,
  input: CreateSubmissionInput,
): Promise<SubmissionDto> {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) throw notFound('Assignment not found')

  if (assignment.dueAt && new Date() > assignment.dueAt) {
    throw forbidden('Assignment deadline has passed')
  }

  await assertStudentCourseContentAccess(studentId, assignment.courseId)

  const submission = await prisma.submission.upsert({
    where: {
      assignmentId_studentId: { assignmentId, studentId },
    },
    create: {
      assignmentId,
      studentId,
      fileUrl: input.fileUrl ?? null,
      text: input.text ?? null,
    },
    update: {
      fileUrl: input.fileUrl ?? null,
      text: input.text ?? null,
      submittedAt: new Date(),
      scoreMarks: null,
      feedback: null,
      gradedAt: null,
    },
    include: { student: { select: { name: true } } },
  })

  return toSubmissionDto(submission)
}

export async function gradeSubmission(
  userId: string,
  role: Role,
  submissionId: string,
  input: GradeSubmissionInput,
): Promise<SubmissionDto> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: { select: { name: true } },
      assignment: true,
    },
  })
  if (!submission) throw notFound('Submission not found')

  if (role === Role.INSTRUCTOR) {
    const assigned = await prisma.batchInstructor.findFirst({
      where: {
        instructorId: userId,
        batch: { courseId: submission.assignment.courseId },
      },
    })
    if (!assigned) {
      throw forbidden('Not assigned to this course')
    }
  } else if (!isAdminStaff(role)) {
    throw forbidden()
  }

  if (input.scoreMarks > submission.assignment.totalMarks) {
    throw validationError('scoreMarks cannot exceed assignment totalMarks')
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      scoreMarks: input.scoreMarks,
      feedback: input.feedback ?? null,
      gradedAt: new Date(),
    },
    include: { student: { select: { name: true } } },
  })

  return toSubmissionDto(updated)
}
