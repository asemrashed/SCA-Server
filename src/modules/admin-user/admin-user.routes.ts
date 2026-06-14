import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import {
  createAdminUserSchema,
  listAdminUsersQuerySchema,
  updateAdminUserSchema,
} from '../../shared/schemas/admin-user.js'
import { SUPER_ADMIN_ROLES } from '../../shared/roles.js'
import * as controller from './admin-user.controller.js'

export const adminUserRouter = Router()

adminUserRouter.get(
  '/',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  validate(listAdminUsersQuerySchema, 'query'),
  controller.list,
)
adminUserRouter.post(
  '/',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  validate(createAdminUserSchema),
  controller.create,
)
adminUserRouter.patch(
  '/:id',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  validate(updateAdminUserSchema),
  controller.update,
)
