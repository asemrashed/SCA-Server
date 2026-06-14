import type { Request, Response, NextFunction } from 'express'
import * as adminUserService from './admin-user.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminUserService.listAdminUsers(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminUserService.createAdminUser(req.body)
    res.status(201).json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminUserService.updateAdminUser(
      req.auth!.userId,
      param(req.params.id),
      req.body,
    )
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}
