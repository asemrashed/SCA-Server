import type { Request, Response, NextFunction } from 'express'
import { EnrollmentStatus } from '../../shared/enums.js'
import * as enrollmentService from './enrollment.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await enrollmentService.listMyEnrollments(req.auth!.userId)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await enrollmentService.getMyEnrollment(
      req.auth!.userId,
      param(req.params.id),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await enrollmentService.createEnrollment(req.auth!.userId, req.body)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function updateLessonProgress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await enrollmentService.markLessonComplete(
      req.auth!.userId,
      param(req.params.lessonId),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listAdminRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status =
      (req.query.status as EnrollmentStatus | undefined) ?? EnrollmentStatus.PENDING
    const data = await enrollmentService.listAdminEnrollmentRequests(status)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function reviewRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await enrollmentService.reviewEnrollmentRequest(
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
