import { z } from 'zod'
import { AttendanceStatus, SessionStatus } from '../enums.js'

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
