import { z } from 'zod'
import { AttendanceStatus, LiveClassType, SessionStatus } from '../enums.js'

export const createSessionSchema = z.object({
  batchId: z.string().cuid(),
  title: z.string().min(1).max(200),
  scheduledAt: z.coerce.date(),
  joinUrl: z.string().url().optional(),
})

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.nativeEnum(SessionStatus).optional(),
  joinUrl: z.string().url().nullable().optional(),
  scheduledAt: z.coerce.date().optional(),
  startedAt: z.coerce.date().nullable().optional(),
  endedAt: z.coerce.date().nullable().optional(),
})

export const createRecordingSchema = z
  .object({
    batchId: z.string().cuid().optional(),
    lessonId: z.string().cuid().optional(),
    sessionId: z.string().cuid().optional(),
    title: z.string().min(1).max(200),
    videoUrl: z.string().url(),
    durationS: z.number().int().positive().optional(),
  })
  .refine(
    (data) => Boolean(data.batchId) || Boolean(data.lessonId) || Boolean(data.sessionId),
    { message: 'Provide batchId, lessonId, or sessionId' },
  )

export const markAttendanceSchema = z
  .array(
    z.object({
      studentId: z.string().cuid(),
      status: z.nativeEnum(AttendanceStatus),
    }),
  )
  .min(1)

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm (24-hour)')

const daysOfWeekSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1, 'Select at least one day')

const liveClassScheduleBaseSchema = z.object({
  subject: z.string().min(1).max(200),
  type: z.nativeEnum(LiveClassType),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  scheduledDate: z.coerce.date().optional(),
  startTime: timeStringSchema,
  endTime: timeStringSchema.optional(),
  passcode: z.string().max(50).optional(),
  joinUrl: z.string().url(),
  order: z.number().int().min(0).optional(),
})

function validateLiveClassScheduleShape(
  data: {
    type: LiveClassType
    daysOfWeek?: number[]
    scheduledDate?: Date
  },
  ctx: z.RefinementCtx,
): void {
  if (data.type === LiveClassType.RECURRING) {
    if (!data.daysOfWeek?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one day',
        path: ['daysOfWeek'],
      })
    }
  } else if (!data.scheduledDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Scheduled date is required',
      path: ['scheduledDate'],
    })
  }
}

export const createLiveClassScheduleSchema = liveClassScheduleBaseSchema
  .extend({ batchId: z.string().cuid() })
  .superRefine(validateLiveClassScheduleShape)

export const updateLiveClassScheduleSchema = liveClassScheduleBaseSchema
  .partial()
  .extend({
    scheduledDate: z.coerce.date().nullable().optional(),
    endTime: timeStringSchema.nullable().optional(),
    passcode: z.string().max(50).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === undefined) return
    validateLiveClassScheduleShape(
      {
        type: data.type,
        daysOfWeek: data.daysOfWeek,
        scheduledDate: data.scheduledDate ?? undefined,
      },
      ctx,
    )
  })
