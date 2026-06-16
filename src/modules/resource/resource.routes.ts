import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import {
  createResourceSchema,
  resourceListQuerySchema,
  updateResourceSchema,
} from '../../shared/schemas/resource.js'
import * as controller from './resource.controller.js'
import { STAFF_ROLES } from '../../shared/roles.js'

export const resourceRouter = Router()

resourceRouter.get(
  '/:id/stream',
  authenticate,
  controller.stream,
)

resourceRouter.get(
  '/',
  authenticate,
  validate(resourceListQuerySchema, 'query'),
  controller.list,
)

resourceRouter.post(
  '/',
  authenticate,
  requireRole(...STAFF_ROLES),
  validate(createResourceSchema),
  controller.create,
)

resourceRouter.patch(
  '/:id',
  authenticate,
  requireRole(...STAFF_ROLES),
  validate(updateResourceSchema),
  controller.update,
)

resourceRouter.delete(
  '/:id',
  authenticate,
  requireRole(...STAFF_ROLES),
  controller.remove,
)
