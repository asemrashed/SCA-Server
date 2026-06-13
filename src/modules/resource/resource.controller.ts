import type { Request, Response, NextFunction } from 'express'
import * as resourceService from './resource.service.js'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await resourceService.listResources(
      req.auth!.userId,
      req.auth!.role,
      req.query as never,
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await resourceService.createResource(
      req.auth!.userId,
      req.auth!.role,
      req.body,
    )
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}
