import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
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
  requireRole(Role.ADMIN),
  validate(createBatchSchema),
  controller.create,
)
batchRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  validate(updateBatchSchema),
  controller.update,
)
batchRouter.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  controller.remove,
)
