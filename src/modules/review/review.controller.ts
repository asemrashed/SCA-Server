import type { Request, Response, NextFunction } from 'express'
import * as reviewService from './review.service.js'

export async function listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reviewService.listPublicReviews(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reviewService.listMyReviews(req.auth!.userId)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reviewService.createOrUpdateReview(req.auth!.userId, req.body)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reviewService.listAdminReviews(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function moderate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reviewService.moderateReview(
      req.auth!.userId,
      String(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await reviewService.deleteReview(String(req.params.id))
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
