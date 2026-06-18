import type { Attendance, LiveClassSchedule, LiveSession, Recording } from '@prisma/client'
import { LiveClassType, SessionStatus } from '../../shared/enums.js'

type SessionWithRecording = LiveSession & {
  recording: Recording | null
}

export interface LiveSessionDto {
  id: string
  batchId: string
  title: string
  status: SessionStatus
  joinUrl: string | null
  scheduledAt: string
  startedAt: string | null
  endedAt: string | null
  recording: {
    id: string
    title: string
    videoUrl: string
    durationS: number | null
  } | null
}

export interface RecordingDto {
  id: string
  batchId: string | null
  lessonId: string | null
  sessionId: string | null
  title: string
  videoUrl: string
  durationS: number | null
  createdAt: string
}

export interface AttendanceSummaryDto {
  sessionId: string
  sessionTitle: string
  batchId: string
  batchTitle: string
  scheduledAt: string
  status: string
  markedAt: string
}

export function toLiveSessionDto(session: SessionWithRecording): LiveSessionDto {
  return {
    id: session.id,
    batchId: session.batchId,
    title: session.title,
    status: session.status as SessionStatus,
    joinUrl: session.joinUrl,
    scheduledAt: session.scheduledAt.toISOString(),
    startedAt: session.startedAt?.toISOString() ?? null,
    endedAt: session.endedAt?.toISOString() ?? null,
    recording: session.recording
      ? {
          id: session.recording.id,
          title: session.recording.title,
          videoUrl: session.recording.videoUrl,
          durationS: session.recording.durationS,
        }
      : null,
  }
}

export function toRecordingDto(recording: Recording): RecordingDto {
  return {
    id: recording.id,
    batchId: recording.batchId,
    lessonId: recording.lessonId,
    sessionId: recording.sessionId,
    title: recording.title,
    videoUrl: recording.videoUrl,
    durationS: recording.durationS,
    createdAt: recording.createdAt.toISOString(),
  }
}

export function toAttendanceSummary(
  row: Attendance & {
    session: LiveSession & { batch: { id: string; title: string } | null }
  },
): AttendanceSummaryDto {
  return {
    sessionId: row.sessionId,
    sessionTitle: row.session.title,
    batchId: row.session.batch!.id,
    batchTitle: row.session.batch!.title,
    scheduledAt: row.session.scheduledAt.toISOString(),
    status: row.status,
    markedAt: row.markedAt.toISOString(),
  }
}

export interface LiveClassScheduleDto {
  id: string
  batchId: string
  type: LiveClassType
  subject: string
  daysOfWeek: number[]
  scheduledDate: string | null
  startTime: string
  endTime: string | null
  passcode: string | null
  joinUrl: string
  order: number
  createdAt: string
  updatedAt: string
  /** Set when this row is backed by a legacy LiveSession record */
  sessionId: string | null
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseScheduleDate(value: Date | string): Date {
  const str = typeof value === 'string' ? value.slice(0, 10) : formatDateOnly(value)
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function toLiveClassScheduleDto(schedule: LiveClassSchedule): LiveClassScheduleDto {
  return {
    id: schedule.id,
    batchId: schedule.batchId,
    type: schedule.type as LiveClassType,
    subject: schedule.subject,
    daysOfWeek: schedule.daysOfWeek,
    scheduledDate: schedule.scheduledDate ? formatDateOnly(schedule.scheduledDate) : null,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    passcode: schedule.passcode,
    joinUrl: schedule.joinUrl,
    order: schedule.order,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    sessionId: null,
  }
}

export function liveSessionToScheduleDto(session: LiveSession): LiveClassScheduleDto {
  const iso = session.scheduledAt.toISOString()
  return {
    id: session.id,
    batchId: session.batchId,
    type: LiveClassType.ONE_TIME,
    subject: session.title,
    daysOfWeek: [],
    scheduledDate: iso.slice(0, 10),
    startTime: iso.slice(11, 16),
    endTime: null,
    passcode: null,
    joinUrl: session.joinUrl ?? '',
    order: 10_000,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    sessionId: session.id,
  }
}

function sortLiveClassScheduleDtos(items: LiveClassScheduleDto[]): LiveClassScheduleDto[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === LiveClassType.RECURRING ? -1 : 1
    }
    if (a.type === LiveClassType.ONE_TIME && a.scheduledDate && b.scheduledDate) {
      const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate)
      if (dateCmp !== 0) return dateCmp
      return a.startTime.localeCompare(b.startTime)
    }
    if (a.order !== b.order) return a.order - b.order
    return a.subject.localeCompare(b.subject)
  })
}

export function mergeLiveClassList(
  schedules: LiveClassSchedule[],
  sessions: LiveSession[],
): LiveClassScheduleDto[] {
  const scheduleDtos = schedules.map(toLiveClassScheduleDto)
  const sessionDtos = sessions.map(liveSessionToScheduleDto)
  return sortLiveClassScheduleDtos([...scheduleDtos, ...sessionDtos])
}
