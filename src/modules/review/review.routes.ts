import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  createReviewSchema,
  listAdminReviewsQuerySchema,
  listPublicReviewsQuerySchema,
  moderateReviewSchema,
} from '../../shared/schemas/review.js'
import * as controller from './review.controller.js'

export const reviewRouter = Router()
export const meReviewRouter = Router()
export const adminReviewRouter = Router()

reviewRouter.get(
  '/',
  validate(listPublicReviewsQuerySchema, 'query'),
  controller.listPublic,
)

meReviewRouter.get(
  '/reviews',
  authenticate,
  requireRole(Role.STUDENT),
  controller.listMine,
)
meReviewRouter.post(
  '/reviews',
  authenticate,
  requireRole(Role.STUDENT),
  validate(createReviewSchema),
  controller.create,
)

adminReviewRouter.get(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(listAdminReviewsQuerySchema, 'query'),
  controller.listAdmin,
)
adminReviewRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(moderateReviewSchema),
  controller.moderate,
)
adminReviewRouter.delete(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.remove,
)
