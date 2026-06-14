import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  createOrderSchema,
  createProductSchema,
  listAdminOrdersQuerySchema,
  productListQuerySchema,
  reviewOrderSchema,
  updateProductSchema,
} from '../../shared/schemas/shop.js'
import * as controller from './shop.controller.js'

export const productRouter = Router()
export const orderRouter = Router()
export const meOrderRouter = Router()
export const adminOrderRouter = Router()

productRouter.get('/', validate(productListQuerySchema, 'query'), controller.listProducts)
productRouter.get('/:idOrSlug', controller.getProduct)
productRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(createProductSchema),
  controller.createProduct,
)
productRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(updateProductSchema),
  controller.updateProduct,
)
productRouter.delete(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.removeProduct,
)

orderRouter.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  controller.createOrder,
)

meOrderRouter.get('/orders', authenticate, controller.listMyOrders)
meOrderRouter.get('/orders/:id', authenticate, controller.getMyOrder)

adminOrderRouter.get(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(listAdminOrdersQuerySchema, 'query'),
  controller.listAdminOrders,
)
adminOrderRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(reviewOrderSchema),
  controller.reviewOrder,
)
