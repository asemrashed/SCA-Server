import { z } from 'zod'
import { subjectInputSchema } from './course.js'

export const batchCurriculumSchema = z.object({
  subjects: z.array(subjectInputSchema),
})

export const applyBatchCurriculumSchema = z.object({
  batchIds: z.array(z.string().cuid()).min(1),
  subjects: z.array(subjectInputSchema),
})
