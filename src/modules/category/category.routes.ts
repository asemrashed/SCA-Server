import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  createCategorySchema,
  categoryListQuerySchema,
  updateCategorySchema,
} from '../../shared/schemas/category.js'
import * as controller from './category.controller.js'

export const categoryRouter = Router()

categoryRouter.get('/', validate(categoryListQuerySchema, 'query'), controller.listCategories)
categoryRouter.get('/:idOrSlug', controller.getCategory)
categoryRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(createCategorySchema),
  controller.createCategory,
)
categoryRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(updateCategorySchema),
  controller.updateCategory,
)
categoryRouter.delete(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.removeCategory,
)
