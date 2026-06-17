import type { Request, Response, NextFunction } from 'express'
import * as categoryService from './category.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function listCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await categoryService.listCategories(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryService.getCategoryByIdOrSlug(param(req.params.idOrSlug))
    res.json({ data: category })
  } catch (err) {
    next(err)
  }
}

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoryService.createCategory(req.body)
    res.status(201).json({ data: category })
  } catch (err) {
    next(err)
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoryService.updateCategory(param(req.params.id), req.body)
    res.json({ data: category })
  } catch (err) {
    next(err)
  }
}

export async function removeCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await categoryService.deleteCategory(param(req.params.id))
    res.json({ data: { success: true } })
  } catch (err) {
    next(err)
  }
}
