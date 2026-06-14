import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { SUPER_ADMIN_ROLES, ADMIN_ROLES } from '../../shared/roles.js'
import {
  batchListQuerySchema,
  createBatchSchema,
  updateBatchSchema,
} from '../../shared/schemas/batch.js'
import * as controller from './batch.controller.js'
import { attachBatchLiveRoutes } from '../liveclass/liveclass.routes.js'

export const batchRouter = Router()

batchRouter.get('/', validate(batchListQuerySchema, 'query'), controller.list)
attachBatchLiveRoutes(batchRouter)
batchRouter.get('/:idOrSlug', controller.getByIdOrSlug)
batchRouter.post(
  '/',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  validate(createBatchSchema),
  controller.create,
)
batchRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(updateBatchSchema),
  controller.update,
)
batchRouter.delete(
  '/:id',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  controller.remove,
)
