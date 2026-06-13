import { Router } from 'express'
import express from 'express'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { initiatePaymentSchema } from '../../shared/schemas/payment.js'
import * as controller from './payment.controller.js'

export const paymentRouter = Router()
export const mePaymentRouter = Router()

paymentRouter.post(
  '/initiate',
  authenticate,
  validate(initiatePaymentSchema),
  controller.initiate,
)

paymentRouter.post(
  '/webhook',
  express.urlencoded({ extended: false }),
  controller.webhook,
)

mePaymentRouter.get('/payments/:id', authenticate, controller.getMine)
