import { z } from 'zod'
import { ResourceCategory } from '../enums.js'

const fileTypeSchema = z.enum(['pdf', 'slide', 'link'])
const categorySchema = z.nativeEnum(ResourceCategory)
const idSchema = z.string().min(1)

const PDF_ONLY_CATEGORIES = new Set<ResourceCategory>([
  ResourceCategory.LECTURE_SHEET,
  ResourceCategory.SOLUTION_PDF,
  ResourceCategory.NOTICE,
  ResourceCategory.RESULT_SHEET,
  ResourceCategory.EXAM,
  ResourceCategory.ASSIGNMENT,
])

const BATCH_SCOPED_CATEGORIES = new Set<ResourceCategory>([
  ResourceCategory.LECTURE_SHEET,
  ResourceCategory.SOLUTION_PDF,
  ResourceCategory.NOTICE,
  ResourceCategory.RESULT_SHEET,
  ResourceCategory.EXAM,
  ResourceCategory.ASSIGNMENT,
])

const SUBJECT_REQUIRED_CATEGORIES = new Set<ResourceCategory>([
  ResourceCategory.LECTURE_SHEET,
  ResourceCategory.SOLUTION_PDF,
  ResourceCategory.EXAM,
  ResourceCategory.ASSIGNMENT,
])

const DEADLINE_CATEGORIES = new Set<ResourceCategory>([
  ResourceCategory.EXAM,
  ResourceCategory.ASSIGNMENT,
])

const baseResourceFields = {
  title: z.string().min(1).max(200),
  fileUrl: z.string().min(1).max(2048),
  fileType: fileTypeSchema.optional().nullable(),
  category: categorySchema.optional().default(ResourceCategory.GENERAL),
  courseId: idSchema,
  batchId: idSchema.optional().nullable(),
  subjectId: idSchema.optional().nullable(),
  moduleId: idSchema.optional().nullable(),
  lessonId: idSchema.optional().nullable(),
  deadlineAt: z.coerce.date().optional().nullable(),
}

function validateResourcePlacement(
  data: {
    category?: ResourceCategory
    fileType?: string | null
    batchId?: string | null
    subjectId?: string | null
    moduleId?: string | null
    lessonId?: string | null
    deadlineAt?: Date | null
  },
  ctx: z.RefinementCtx,
): void {
  const category = data.category ?? ResourceCategory.GENERAL

  if (PDF_ONLY_CATEGORIES.has(category) && data.fileType && data.fileType !== 'pdf') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'This resource type only supports PDF files',
      path: ['fileType'],
    })
  }

  if (category === ResourceCategory.GENERAL && !data.moduleId && !data.lessonId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'General resources require moduleId or lessonId',
      path: ['moduleId'],
    })
  }

  if (DEADLINE_CATEGORIES.has(category) && !data.deadlineAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Deadline is required for exams and assignments',
      path: ['deadlineAt'],
    })
  }
}

export const createResourceSchema = z
  .object(baseResourceFields)
  .superRefine((data, ctx) => validateResourcePlacement(data, ctx))

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  fileUrl: z.string().min(1).max(2048).optional(),
  fileType: fileTypeSchema.optional().nullable(),
  category: categorySchema.optional(),
  batchId: idSchema.optional().nullable(),
  subjectId: idSchema.optional().nullable(),
  moduleId: idSchema.optional().nullable(),
  lessonId: idSchema.optional().nullable(),
  deadlineAt: z.coerce.date().optional().nullable(),
})

export const resourceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  courseId: idSchema,
  batchId: idSchema.optional(),
  subjectId: idSchema.optional(),
  moduleId: idSchema.optional(),
  lessonId: idSchema.optional(),
  category: categorySchema.optional(),
})
