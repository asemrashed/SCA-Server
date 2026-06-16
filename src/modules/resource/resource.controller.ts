import type { Request, Response, NextFunction } from 'express'
import * as resourceService from './resource.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

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

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await resourceService.updateResource(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await resourceService.deleteResource(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.id),
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function stream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { buffer, contentType, title } = await resourceService.streamResource(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.id),
    )

    const safeName = title.replace(/[^\w\s.-]/g, '').trim() || 'document'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${safeName}.pdf"`)
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}
