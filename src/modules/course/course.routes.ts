import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import {
  courseListQuerySchema,
  createCourseSchema,
  updateCourseSchema,
} from '../../shared/schemas/course.js'
import * as controller from './course.controller.js'
import { attachCourseLiveRoutes } from '../liveclass/liveclass.routes.js'

export const courseRouter = Router()

courseRouter.get('/', validate(courseListQuerySchema, 'query'), controller.list)
attachCourseLiveRoutes(courseRouter)
courseRouter.get('/:idOrSlug', controller.getByIdOrSlug)
courseRouter.post(
  '/',
  authenticate,
  requireRole(Role.ADMIN, Role.INSTRUCTOR),
  validate(createCourseSchema),
  controller.create,
)
courseRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN, Role.INSTRUCTOR),
  validate(updateCourseSchema),
  controller.update,
)
courseRouter.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  controller.remove,
)
