import type { Attendance, LiveSession, Recording } from '@prisma/client'
import { SessionStatus } from '../../shared/enums.js'

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
