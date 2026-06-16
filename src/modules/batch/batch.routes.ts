import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from '../../shared/roles.js'
import { createContentGrantSchema } from '../../shared/schemas/course.js'
import { batchListQuerySchema, updateBatchSchema } from '../../shared/schemas/batch.js'
import * as controller from './batch.controller.js'
import { attachBatchLiveRoutes } from '../liveclass/liveclass.routes.js'

export const batchRouter = Router()

batchRouter.get('/', validate(batchListQuerySchema, 'query'), controller.list)

batchRouter.get(
  '/:id/content-grants',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.listContentGrants,
)
batchRouter.post(
  '/:id/content-grants',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(createContentGrantSchema),
  controller.createContentGrant,
)
batchRouter.delete(
  '/:id/content-grants/:grantId',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.deleteContentGrant,
)

attachBatchLiveRoutes(batchRouter)

batchRouter.get('/:idOrSlug', controller.getByIdOrSlug)
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
