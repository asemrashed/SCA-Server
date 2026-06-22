import { prisma } from '../../config/db.js'
import { env } from '../../config/env.js'
import { forbidden, notFound, validationError } from '../../lib/errors.js'
import { LessonType, type Role } from '../../shared/enums.js'
import { isStaff } from '../../shared/roles.js'
import {
  assertStudentCourseContentAccess,
  isStudentCourseContentAccess,
} from '../enrollment/enrollment.access.js'
import {
  buildVimeoBridgeHtml,
  buildYoutubeBridgeHtml,
  parseVideoUrl,
  type ParsedVideoSource,
} from './lesson-playback.utils.js'

type LessonRow = {
  id: string
  title: string
  type: string
  videoUrl: string | null
  content: string | null
  isPreview: boolean
  module: {
    courseId: string | null
    subject: { batch: { courseId: string } } | null
  }
}

const lessonSelect = {
  id: true,
  title: true,
  type: true,
  videoUrl: true,
  content: true,
  isPreview: true,
  module: {
    select: {
      courseId: true,
      subject: { select: { batch: { select: { courseId: true } } } },
    },
  },
} as const

async function getLessonOrThrow(lessonId: string): Promise<LessonRow> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: lessonSelect,
  })
  if (!lesson) {
    throw notFound('Lesson not found')
  }
  return lesson
}

function assertVideoLesson(lesson: LessonRow): void {
  const type = lesson.type as LessonType
  if (type !== LessonType.RECORDED && type !== LessonType.LIVE) {
    throw validationError('This lesson is not a video lesson')
  }
  if (!lesson.videoUrl) {
    throw notFound('Lesson video not found')
  }
}

function assertDocumentLesson(lesson: LessonRow): void {
  if ((lesson.type as LessonType) !== LessonType.DOCUMENT) {
    throw validationError('This lesson is not a document lesson')
  }
  if (!lesson.videoUrl) {
    throw notFound('Lesson document not found')
  }
}

function resolveCourseId(lesson: LessonRow): string | null {
  return lesson.module.courseId ?? lesson.module.subject?.batch.courseId ?? null
}

async function assertCanPlayLesson(
  userId: string | undefined,
  role: Role | undefined,
  lesson: LessonRow,
): Promise<void> {
  if (lesson.isPreview) return
  if (role && isStaff(role)) return

  const courseId = resolveCourseId(lesson)
  if (!courseId) {
    throw forbidden('Not allowed to play this lesson')
  }
  if (!userId) {
    throw forbidden('Sign in required to play this lesson')
  }
  await assertStudentCourseContentAccess(userId, courseId)
}

export async function getLessonPlayMeta(
  userId: string | undefined,
  role: Role | undefined,
  lessonId: string,
): Promise<{ kind: ParsedVideoSource['kind']; title: string }> {
  const lesson = await getLessonOrThrow(lessonId)
  assertVideoLesson(lesson)
  await assertCanPlayLesson(userId, role, lesson)
  const source = parseVideoUrl(lesson.videoUrl!)
  if (!source) {
    throw validationError('Unsupported video URL')
  }
  return { kind: source.kind, title: lesson.title }
}

export async function getLessonEmbedHtml(
  userId: string | undefined,
  role: Role | undefined,
  lessonId: string,
  clientOrigin: string,
  autoplay: boolean,
): Promise<{ html: string; kind: ParsedVideoSource['kind'] }> {
  const lesson = await getLessonOrThrow(lessonId)
  assertVideoLesson(lesson)
  await assertCanPlayLesson(userId, role, lesson)

  const source = parseVideoUrl(lesson.videoUrl!)
  if (!source) {
    throw validationError('Unsupported video URL')
  }
  if (source.kind === 'file') {
    throw validationError('Use the stream endpoint for file videos')
  }

  const safeOrigin = clientOrigin || env.CORS_ORIGIN
  const html =
    source.kind === 'youtube'
      ? buildYoutubeBridgeHtml(source.videoId, safeOrigin, autoplay)
      : buildVimeoBridgeHtml(source.videoId, autoplay)

  return { html, kind: source.kind }
}

export async function streamLessonVideo(
  userId: string | undefined,
  role: Role | undefined,
  lessonId: string,
): Promise<{ buffer: Buffer; contentType: string; title: string }> {
  const lesson = await getLessonOrThrow(lessonId)
  assertVideoLesson(lesson)
  await assertCanPlayLesson(userId, role, lesson)

  const source = parseVideoUrl(lesson.videoUrl!)
  if (!source || source.kind !== 'file') {
    throw validationError('This lesson is not a streamable file video')
  }

  const upstream = await fetch(source.src)
  if (!upstream.ok) {
    throw notFound('Video file could not be loaded')
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  return { buffer, contentType, title: lesson.title }
}

export async function streamLessonThumbnail(
  userId: string | undefined,
  role: Role | undefined,
  lessonId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const lesson = await getLessonOrThrow(lessonId)
  assertVideoLesson(lesson)
  await assertCanPlayLesson(userId, role, lesson)

  const source = parseVideoUrl(lesson.videoUrl!)
  if (!source || source.kind !== 'youtube') return null

  const upstream = await fetch(
    `https://img.youtube.com/vi/${source.videoId}/maxresdefault.jpg`,
  )
  if (!upstream.ok) {
    const fallback = await fetch(
      `https://img.youtube.com/vi/${source.videoId}/hqdefault.jpg`,
    )
    if (!fallback.ok) return null
    return {
      buffer: Buffer.from(await fallback.arrayBuffer()),
      contentType: fallback.headers.get('content-type') ?? 'image/jpeg',
    }
  }

  return {
    buffer: Buffer.from(await upstream.arrayBuffer()),
    contentType: upstream.headers.get('content-type') ?? 'image/jpeg',
  }
}

export async function streamLessonDocument(
  userId: string | undefined,
  role: Role | undefined,
  lessonId: string,
): Promise<{ buffer: Buffer; contentType: string; title: string }> {
  const lesson = await getLessonOrThrow(lessonId)
  assertDocumentLesson(lesson)
  await assertCanPlayLesson(userId, role, lesson)

  const upstream = await fetch(lesson.videoUrl!)
  if (!upstream.ok) {
    throw notFound('Document could not be loaded')
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get('content-type') ?? 'application/pdf'
  return { buffer, contentType, title: lesson.title }
}

export async function canPlayLesson(
  userId: string | undefined,
  role: Role | undefined,
  lessonId: string,
): Promise<boolean> {
  try {
    const lesson = await getLessonOrThrow(lessonId)
    assertVideoLesson(lesson)
    if (lesson.isPreview) return true
    if (role && isStaff(role)) return true
    const courseId = resolveCourseId(lesson)
    if (!courseId || !userId) return false
    return isStudentCourseContentAccess(userId, courseId)
  } catch {
    return false
  }
}
