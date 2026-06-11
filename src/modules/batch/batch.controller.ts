import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../../lib/jwt.js'
import type { Role } from '../../shared/enums.js'
import * as batchService from './batch.service.js'

function getOptionalAuth(req: Request): { role?: Role; userId?: string } {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return {}
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    return { role: payload.role, userId: payload.sub }
  } catch {
    return {}
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth
      ? { role: req.auth.role, userId: req.auth.userId }
      : getOptionalAuth(req)
    const result = await batchService.listBatches(req.query as never, auth.role, auth.userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getByIdOrSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth
      ? { role: req.auth.role }
      : getOptionalAuth(req)
    const batch = await batchService.getBatchByIdOrSlug(String(req.params.idOrSlug), auth.role)
    res.json({ data: batch })
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const batch = await batchService.createBatch(req.body)
    res.status(201).json({ data: batch })
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const batch = await batchService.updateBatch(String(req.params.id), req.body)
    res.json({ data: batch })
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await batchService.deleteBatch(String(req.params.id))
    res.json({ data: { success: true } })
  } catch (err) {
    next(err)
  }
}
