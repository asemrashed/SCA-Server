import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  reviewResourceSubmissionSchema,
  uploadResourceSubmissionResultSchema,
} from '../../shared/schemas/resource-submission.js'
import * as controller from './resource-submission.controller.js'

export const meResourceSubmissionRouter = Router()
export const adminResourceSubmissionRouter = Router()

meResourceSubmissionRouter.post(
  '/enrollments/:enrollmentId/resources/:resourceId/submissions',
  authenticate,
  requireRole(Role.STUDENT),
  controller.submit,
)

meResourceSubmissionRouter.get(
  '/enrollments/:enrollmentId/submissions/:category',
  authenticate,
  requireRole(Role.STUDENT),
  controller.listForEnrollment,
)

meResourceSubmissionRouter.get(
  '/enrollments/:enrollmentId/assessment-results',
  authenticate,
  requireRole(Role.STUDENT),
  controller.listResults,
)

meResourceSubmissionRouter.get(
  '/resource-submissions/:id/result/stream',
  authenticate,
  requireRole(Role.STUDENT),
  controller.streamResult,
)

adminResourceSubmissionRouter.get(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.listAdmin,
)

adminResourceSubmissionRouter.patch(
  '/:id/review',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(reviewResourceSubmissionSchema),
  controller.review,
)

adminResourceSubmissionRouter.patch(
  '/:id/result',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(uploadResourceSubmissionResultSchema),
  controller.uploadResult,
)

adminResourceSubmissionRouter.get(
  '/:id/result/stream',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.streamResultAdmin,
)
