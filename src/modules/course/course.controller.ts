import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../../lib/jwt.js'
import type { Role } from '../../shared/enums.js'
import * as batchService from '../batch/batch.service.js'
import * as courseService from './course.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function getOptionalRole(req: Request): Role | undefined {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return undefined
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    return payload.role
  } catch {
    return undefined
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.auth?.role ?? getOptionalRole(req)
    const result = await courseService.listCourses(req.query as never, role)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getByIdOrSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.auth?.role ?? getOptionalRole(req)
    const course = await courseService.getCourseByIdOrSlug(param(req.params.idOrSlug), role)
    res.json({ data: course })
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await courseService.createCourse(req.body)
    res.status(201).json({ data: course })
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await courseService.updateCourse(param(req.params.id), req.body)
    res.json({ data: course })
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await courseService.deleteCourse(param(req.params.id))
    res.json({ data: { success: true } })
  } catch (err) {
    next(err)
  }
}

export async function listBatchesForCourse(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const role = req.auth?.role ?? getOptionalRole(req)
    const data = await batchService.listBatchesByCourse(param(req.params.courseId), role)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function createBatchForCourse(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const batch = await batchService.createBatch({
      ...req.body,
      courseId: param(req.params.courseId),
    })
    res.status(201).json({ data: batch })
  } catch (err) {
    next(err)
  }
}
