import type { NextFunction, Request, Response } from 'express'
import * as service from './monthly-payment.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function getEnrollmentHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.getEnrollmentPaymentHistory(
      req.auth!.userId,
      param(req.params.enrollmentId),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function requestPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await service.requestMonthlyPayment(
      req.auth!.userId,
      param(req.params.enrollmentId),
    )
    res.status(201).json({ data })
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
    const result = await service.listMonthlyPayments(req.query as never)
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
    const data = await service.reviewMonthlyPayment(
      req.auth!.userId,
      param(req.params.id),
      req.body,
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listUnpaidStudents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await service.listUnpaidStudents(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
