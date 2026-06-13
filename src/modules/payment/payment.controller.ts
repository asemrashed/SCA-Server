import type { Request, Response, NextFunction } from 'express'
import * as paymentService from './payment.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await paymentService.initiatePayment(req.auth!.userId, req.body)
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = req.body as Record<string, unknown>
    const result = await paymentService.handlePaymentWebhook(payload)
    res.status(result.ok ? 200 : 400).send(result.ok ? 'OK' : 'INVALID')
  } catch (err) {
    next(err)
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await paymentService.getPaymentForUser(
      req.auth!.userId,
      param(req.params.id),
    )
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
