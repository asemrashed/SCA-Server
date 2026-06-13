import type { Request, Response, NextFunction } from 'express'
import { Role } from '../../shared/enums.js'
import * as liveclassService from './liveclass.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function listBatchSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await liveclassService.listBatchSessions(
      req.auth!.userId,
      req.auth!.role as Role,
      param(req.params.id),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listCourseSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await liveclassService.listCourseSessions(
      req.auth!.userId,
      req.auth!.role as Role,
      param(req.params.id),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await liveclassService.createSession(
      req.auth!.userId,
      req.auth!.role as Role,
      req.body,
    )
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await liveclassService.updateSession(
      req.auth!.userId,
      req.auth!.role as Role,
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listBatchRecordings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await liveclassService.listBatchRecordings(
      req.auth!.userId,
      param(req.params.id),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listCourseRecordings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await liveclassService.listCourseRecordings(
      req.auth!.userId,
      param(req.params.id),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function createRecording(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await liveclassService.createRecording(
      req.auth!.userId,
      req.auth!.role as Role,
      req.body,
    )
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await liveclassService.markSessionAttendance(
      req.auth!.userId,
      req.auth!.role as Role,
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await liveclassService.getMyAttendance(req.auth!.userId)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
