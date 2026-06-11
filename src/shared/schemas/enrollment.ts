import { z } from 'zod'

export const createEnrollmentSchema = z
  .object({
    batchId: z.string().cuid().optional(),
    courseId: z.string().cuid().optional(),
    couponCode: z.string().optional(),
  })
  .refine((data) => Boolean(data.batchId) !== Boolean(data.courseId), {
    message: 'Exactly one of batchId or courseId is required',
  })

export const lessonProgressSchema = z.object({
  completed: z.literal(true),
})
