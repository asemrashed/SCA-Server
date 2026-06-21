import type { NextFunction, Request, Response } from 'express'
import { ResourceCategory } from '../../shared/enums.js'
import { listResourceSubmissionsQuerySchema } from '../../shared/schemas/resource-submission.js'
import * as service from './resource-submission.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function submit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.submitResource(
      req.auth!.userId,
      param(req.params.enrollmentId),
      param(req.params.resourceId),
    )
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listForEnrollment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = param(req.params.category) as ResourceCategory
    const data = await service.listSubmissionsForEnrollment(
      req.auth!.userId,
      param(req.params.enrollmentId),
      category,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listResults(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.listStudentResults(
      req.auth!.userId,
      param(req.params.enrollmentId),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function streamResult(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { buffer, contentType, title } = await service.streamSubmissionResult(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.id),
    )
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(title)}.pdf"`)
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}

export async function listAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listResourceSubmissionsQuerySchema.parse(req.query)
    const result = await service.listAdminSubmissions(query)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function review(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.reviewSubmission(
      req.auth!.userId,
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function uploadResult(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.uploadSubmissionResult(
      req.auth!.userId,
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function streamResultAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  return streamResult(req, res, next)
}
