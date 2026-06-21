import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  listMonthlyPaymentsQuerySchema,
  reviewMonthlyPaymentSchema,
} from '../../shared/schemas/monthly-payment.js'
import * as controller from './monthly-payment.controller.js'

export const meMonthlyPaymentRouter = Router()
export const adminMonthlyPaymentRouter = Router()

meMonthlyPaymentRouter.get(
  '/enrollments/:enrollmentId/payment-history',
  authenticate,
  requireRole(Role.STUDENT),
  controller.getEnrollmentHistory,
)

meMonthlyPaymentRouter.post(
  '/enrollments/:enrollmentId/monthly-payments',
  authenticate,
  requireRole(Role.STUDENT),
  controller.requestPayment,
)

adminMonthlyPaymentRouter.get(
  '/unpaid-students',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(listMonthlyPaymentsQuerySchema, 'query'),
  controller.listUnpaidStudents,
)

adminMonthlyPaymentRouter.get(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(listMonthlyPaymentsQuerySchema, 'query'),
  controller.listAdmin,
)

adminMonthlyPaymentRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(reviewMonthlyPaymentSchema),
  controller.review,
)
