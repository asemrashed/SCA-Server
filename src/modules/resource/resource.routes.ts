import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import {
  createResourceSchema,
  resourceListQuerySchema,
} from '../../shared/schemas/resource.js'
import * as controller from './resource.controller.js'

export const resourceRouter = Router()

resourceRouter.get(
  '/',
  authenticate,
  validate(resourceListQuerySchema, 'query'),
  controller.list,
)

resourceRouter.post(
  '/',
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate(createResourceSchema),
  controller.create,
)
