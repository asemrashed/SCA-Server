import type { Assignment, Exam, ExamAttempt, ExamQuestion, Question, Submission } from '@prisma/client'
import type { AttemptStatus, ExamStatus, QuestionType } from '../../shared/enums.js'

type QuestionRow = Question

type ExamQuestionWithQuestion = ExamQuestion & { question: QuestionRow }

type ExamWithQuestions = Exam & { questions: ExamQuestionWithQuestion[] }

type ExamAttemptWithExam = ExamAttempt & { exam: ExamWithQuestions }

export interface QuestionDto {
  id: string
  stem: string
  type: QuestionType
  options: { key: string; text: string }[] | null
  correct?: unknown
  category: string | null
  marks: number
  createdAt: string
  updatedAt: string
}

export interface ExamQuestionDto {
  id: string
  stem: string
  type: QuestionType
  options: { key: string; text: string }[] | null
  correct?: unknown
  marks: number
  order: number
}

export interface ExamListItemDto {
  id: string
  title: string
  status: ExamStatus
  durationMin: number | null
  totalMarks: number
  moduleId: string | null
  opensAt: string | null
  closesAt: string | null
  questionCount: number
  attempt?: {
    id: string
    status: AttemptStatus
    scoreMarks: number | null
    scorePct: number | null
    submittedAt: string | null
  } | null
}

export interface ExamDetailDto extends ExamListItemDto {
  questions: ExamQuestionDto[]
}

export interface ExamAttemptDto {
  id: string
  examId: string
  status: AttemptStatus
  answers: Record<string, unknown>
  scoreMarks: number | null
  scorePct: number | null
  startedAt: string
  submittedAt: string | null
  expiresAt: string | null
  exam: {
    id: string
    title: string
    durationMin: number | null
    totalMarks: number
    questions: ExamQuestionDto[]
  }
}

export interface AssignmentListItemDto {
  id: string
  title: string
  description: string | null
  totalMarks: number
  moduleId: string | null
  dueAt: string | null
  submission?: {
    id: string
    scoreMarks: number | null
    feedback: string | null
    submittedAt: string
    gradedAt: string | null
  } | null
}

export interface SubmissionDto {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  fileUrl: string | null
  text: string | null
  scoreMarks: number | null
  feedback: string | null
  submittedAt: string
  gradedAt: string | null
}

function parseOptions(raw: unknown): { key: string; text: string }[] | null {
  if (!raw || !Array.isArray(raw)) return null
  return raw as { key: string; text: string }[]
}

export function toQuestionDto(question: QuestionRow, includeCorrect: boolean): QuestionDto {
  const dto: QuestionDto = {
    id: question.id,
    stem: question.stem,
    type: question.type as QuestionType,
    options: parseOptions(question.options),
    category: question.category,
    marks: question.marks,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  }
  if (includeCorrect) {
    dto.correct = question.correct
  }
  return dto
}

function toExamQuestionDto(
  row: ExamQuestionWithQuestion,
  includeCorrect: boolean,
): ExamQuestionDto {
  const dto: ExamQuestionDto = {
    id: row.question.id,
    stem: row.question.stem,
    type: row.question.type as QuestionType,
    options: parseOptions(row.question.options),
    marks: row.marks ?? row.question.marks,
    order: row.order,
  }
  if (includeCorrect) {
    dto.correct = row.question.correct
  }
  return dto
}

export function toExamListItem(
  exam: ExamWithQuestions,
  includeCorrect: boolean,
  attempt?: ExamAttempt | null,
): ExamListItemDto {
  return {
    id: exam.id,
    title: exam.title,
    status: exam.status as ExamStatus,
    durationMin: exam.durationMin,
    totalMarks: exam.totalMarks,
    moduleId: exam.moduleId,
    opensAt: exam.opensAt?.toISOString() ?? null,
    closesAt: exam.closesAt?.toISOString() ?? null,
    questionCount: exam.questions.length,
    attempt: attempt
      ? {
          id: attempt.id,
          status: attempt.status as AttemptStatus,
          scoreMarks: attempt.scoreMarks,
          scorePct: attempt.scorePct,
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
        }
      : null,
  }
}

export function toExamDetail(
  exam: ExamWithQuestions,
  includeCorrect: boolean,
  attempt?: ExamAttempt | null,
): ExamDetailDto {
  return {
    ...toExamListItem(exam, includeCorrect, attempt),
    questions: exam.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => toExamQuestionDto(q, includeCorrect)),
  }
}

export function toExamAttemptDto(
  attempt: ExamAttemptWithExam,
  includeCorrect: boolean,
): ExamAttemptDto {
  return {
    id: attempt.id,
    examId: attempt.examId,
    status: attempt.status as AttemptStatus,
    answers: (attempt.answers as Record<string, unknown>) ?? {},
    scoreMarks: attempt.scoreMarks,
    scorePct: attempt.scorePct,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      durationMin: attempt.exam.durationMin,
      totalMarks: attempt.exam.totalMarks,
      questions: attempt.exam.questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((q) => toExamQuestionDto(q, includeCorrect)),
    },
  }
}

export function toAssignmentListItem(
  assignment: Assignment,
  submission?: Submission | null,
): AssignmentListItemDto {
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    totalMarks: assignment.totalMarks,
    moduleId: assignment.moduleId,
    dueAt: assignment.dueAt?.toISOString() ?? null,
    submission: submission
      ? {
          id: submission.id,
          scoreMarks: submission.scoreMarks,
          feedback: submission.feedback,
          submittedAt: submission.submittedAt.toISOString(),
          gradedAt: submission.gradedAt?.toISOString() ?? null,
        }
      : null,
  }
}

export function toSubmissionDto(
  submission: Submission & { student: { name: string } },
): SubmissionDto {
  return {
    id: submission.id,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    studentName: submission.student.name,
    fileUrl: submission.fileUrl,
    text: submission.text,
    scoreMarks: submission.scoreMarks,
    feedback: submission.feedback,
    submittedAt: submission.submittedAt.toISOString(),
    gradedAt: submission.gradedAt?.toISOString() ?? null,
  }
}
