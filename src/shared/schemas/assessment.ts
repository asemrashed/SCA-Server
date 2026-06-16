import { z } from 'zod'
import { QuestionType } from '../enums.js'

/** Prisma CUID ids — avoid strict cuid() v1-only checks */
const idSchema = z.string().min(1)

export const questionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  type: z.nativeEnum(QuestionType).optional(),
  sort: z.string().optional(),
})

export const createQuestionSchema = z.object({
  stem: z.string().min(1).max(5000),
  type: z.nativeEnum(QuestionType),
  options: z.array(z.object({ key: z.string(), text: z.string() })).optional().nullable(),
  correct: z.unknown(),
  category: z.string().max(100).optional().nullable(),
  marks: z.number().int().min(1).default(1),
})

export const createExamSchema = z.object({
  courseId: idSchema,
  moduleId: idSchema.optional().nullable(),
  title: z.string().min(1).max(200),
  durationMin: z.number().int().positive().optional().nullable(),
  questionIds: z.array(idSchema).min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export const updateAttemptSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  submit: z.boolean().optional(),
})

export const createAssignmentSchema = z.object({
  courseId: idSchema,
  moduleId: idSchema.optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  totalMarks: z.number().int().min(1).default(100),
  dueAt: z.coerce.date().optional().nullable(),
})

export const createSubmissionSchema = z
  .object({
    fileUrl: z.string().url().optional().nullable(),
    text: z.string().max(50000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.fileUrl && !data.text?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either fileUrl or text is required',
        path: ['text'],
      })
    }
  })

export const gradeSubmissionSchema = z.object({
  scoreMarks: z.number().int().min(0),
  feedback: z.string().max(5000).optional().nullable(),
})
