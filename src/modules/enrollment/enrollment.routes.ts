import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  createEnrollmentSchema,
  listAdminEnrollmentsQuerySchema,
  reviewEnrollmentSchema,
} from '../../shared/schemas/enrollment.js'
import * as controller from './enrollment.controller.js'

export const enrollmentRouter = Router()
export const meEnrollmentRouter = Router()
export const adminEnrollmentRouter = Router()

enrollmentRouter.post(
  '/',
  authenticate,
  requireRole(Role.STUDENT),
  validate(createEnrollmentSchema),
  controller.create,
)

meEnrollmentRouter.get(
  '/enrollments',
  authenticate,
  requireRole(Role.STUDENT),
  controller.listMine,
)
meEnrollmentRouter.get(
  '/enrollments/:id',
  authenticate,
  requireRole(Role.STUDENT),
  controller.getMine,
)

adminEnrollmentRouter.get(
  '/overview',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.getAdminOverview,
)
adminEnrollmentRouter.get(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(listAdminEnrollmentsQuerySchema, 'query'),
  controller.listAdminRequests,
)
adminEnrollmentRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(reviewEnrollmentSchema),
  controller.reviewRequest,
)
