import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { createBatchBodySchema } from '../../shared/schemas/batch.js'
import { applyBatchCurriculumSchema } from '../../shared/schemas/batch-curriculum.js'
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from '../../shared/roles.js'
import {
  courseListQuerySchema,
  createCourseSchema,
  updateCourseSchema,
} from '../../shared/schemas/course.js'
import { attachCourseLiveRoutes } from '../liveclass/liveclass.routes.js'
import * as controller from './course.controller.js'

export const courseRouter = Router()

courseRouter.get('/', validate(courseListQuerySchema, 'query'), controller.list)

courseRouter.get('/:courseId/batches', controller.listBatchesForCourse)
courseRouter.post(
  '/:courseId/batches',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  validate(createBatchBodySchema),
  controller.createBatchForCourse,
)
courseRouter.put(
  '/:courseId/batch-curriculum',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(applyBatchCurriculumSchema),
  controller.applyBatchCurriculum,
)

attachCourseLiveRoutes(courseRouter)

courseRouter.get('/:idOrSlug', controller.getByIdOrSlug)
courseRouter.post(
  '/',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  validate(createCourseSchema),
  controller.create,
)
courseRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(updateCourseSchema),
  controller.update,
)
courseRouter.delete(
  '/:id',
  authenticate,
  requireRole(...SUPER_ADMIN_ROLES),
  controller.remove,
)
