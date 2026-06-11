import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import {
  createEnrollmentSchema,
  lessonProgressSchema,
} from '../../shared/schemas/enrollment.js'
import * as controller from './enrollment.controller.js'

export const enrollmentRouter = Router()
export const meEnrollmentRouter = Router()

enrollmentRouter.post(
  '/',
  authenticate,
  requireRole(Role.STUDENT),
  validate(createEnrollmentSchema),
  controller.create,
)

meEnrollmentRouter.get(
  '/enrollments',
  authenticate,
  requireRole(Role.STUDENT),
  controller.listMine,
)
meEnrollmentRouter.get(
  '/enrollments/:id',
  authenticate,
  requireRole(Role.STUDENT),
  controller.getMine,
)
meEnrollmentRouter.patch(
  '/lessons/:lessonId/progress',
  authenticate,
  requireRole(Role.STUDENT),
  validate(lessonProgressSchema),
  controller.updateLessonProgress,
)
