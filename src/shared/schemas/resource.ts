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

const baseResourceFields = {
  title: z.string().min(1).max(200),
  fileUrl: z.string().min(1).max(2048),
  fileType: fileTypeSchema.optional().nullable(),
  category: categorySchema.optional().default(ResourceCategory.GENERAL),
  courseId: idSchema,
  subjectId: idSchema.optional().nullable(),
  moduleId: idSchema.optional().nullable(),
  lessonId: idSchema.optional().nullable(),
}

function validateResourcePlacement(
  data: {
    category?: ResourceCategory
    fileType?: string | null
    moduleId?: string | null
    lessonId?: string | null
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
}

export const createResourceSchema = z
  .object(baseResourceFields)
  .superRefine((data, ctx) => validateResourcePlacement(data, ctx))

export const updateResourceSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    fileUrl: z.string().min(1).max(2048).optional(),
    fileType: fileTypeSchema.optional().nullable(),
    category: categorySchema.optional(),
    subjectId: idSchema.optional().nullable(),
    moduleId: idSchema.optional().nullable(),
    lessonId: idSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.category !== undefined || data.moduleId !== undefined || data.lessonId !== undefined) {
      validateResourcePlacement(
        {
          category: data.category,
          fileType: data.fileType,
          moduleId: data.moduleId,
          lessonId: data.lessonId,
        },
        ctx,
      )
    }
  })

export const resourceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  courseId: idSchema,
  subjectId: idSchema.optional(),
  moduleId: idSchema.optional(),
  lessonId: idSchema.optional(),
  category: categorySchema.optional(),
})
