import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../../lib/jwt.js'
import type { Role } from '../../shared/enums.js'
import * as service from './lesson-playback.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function getOptionalAuth(req: Request): { userId?: string; role?: Role } {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return {}
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    return { userId: payload.sub, role: payload.role }
  } catch {
    return {}
  }
}

function clientOrigin(req: Request): string {
  const fromQuery = typeof req.query.origin === 'string' ? req.query.origin : undefined
  const fromHeader = req.headers.origin
  return fromQuery ?? (typeof fromHeader === 'string' ? fromHeader : '')
}

export async function playMeta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth ?? getOptionalAuth(req)
    const meta = await service.getLessonPlayMeta(
      auth.userId,
      auth.role,
      param(req.params.lessonId),
    )
    res.json({ data: meta })
  } catch (err) {
    next(err)
  }
}

export async function embed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth ?? getOptionalAuth(req)
    const autoplay = req.query.autoplay === '1'
    const { html } = await service.getLessonEmbedHtml(
      auth.userId,
      auth.role,
      param(req.params.lessonId),
      clientOrigin(req),
      autoplay,
    )

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(html)
  } catch (err) {
    next(err)
  }
}

export async function stream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth ?? getOptionalAuth(req)
    const { buffer, contentType, title } = await service.streamLessonVideo(
      auth.userId ?? '',
      auth.role ?? ('STUDENT' as Role),
      param(req.params.lessonId),
    )

    const safeName = title.replace(/[^\w\s.-]/g, '').trim() || 'video'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`)
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}

export async function thumbnail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth ?? getOptionalAuth(req)
    const result = await service.streamLessonThumbnail(
      auth.userId,
      auth.role,
      param(req.params.lessonId),
    )
    if (!result) {
      res.status(204).end()
      return
    }

    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.send(result.buffer)
  } catch (err) {
    next(err)
  }
}
