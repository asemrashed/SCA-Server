import type { Request, Response, NextFunction } from 'express'
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

export async function listAdminRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await enrollmentService.listAdminEnrollmentRequests(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getAdminOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await enrollmentService.getAdminEnrollmentOverview()
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

export async function createManual(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await enrollmentService.createManualEnrollment(req.body)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}
