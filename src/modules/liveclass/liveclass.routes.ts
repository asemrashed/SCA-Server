import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import {
  createRecordingSchema,
  createSessionSchema,
  markAttendanceSchema,
  updateSessionSchema,
} from '../../shared/schemas/liveclass.js'
import * as controller from './liveclass.controller.js'

export const sessionsRouter = Router()
export const recordingsRouter = Router()
export const meLiveclassRouter = Router()

sessionsRouter.post(
  '/',
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate(createSessionSchema),
  controller.createSession,
)

sessionsRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate(updateSessionSchema),
  controller.updateSession,
)

sessionsRouter.post(
  '/:id/attendance',
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate(markAttendanceSchema),
  controller.markAttendance,
)

recordingsRouter.post(
  '/',
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate(createRecordingSchema),
  controller.createRecording,
)

meLiveclassRouter.get(
  '/attendance',
  authenticate,
  requireRole(Role.STUDENT),
  controller.getMyAttendance,
)

/** Mount on batch/course routers before /:idOrSlug */
export function attachBatchLiveRoutes(batchRouter: Router): void {
  batchRouter.get(
    '/:id/sessions',
    authenticate,
    controller.listBatchSessions,
  )
  batchRouter.get(
    '/:id/recordings',
    authenticate,
    requireRole(Role.STUDENT),
    controller.listBatchRecordings,
  )
}

export function attachCourseLiveRoutes(courseRouter: Router): void {
  courseRouter.get(
    '/:id/sessions',
    authenticate,
    controller.listCourseSessions,
  )
  courseRouter.get(
    '/:id/recordings',
    authenticate,
    requireRole(Role.STUDENT),
    controller.listCourseRecordings,
  )
}
