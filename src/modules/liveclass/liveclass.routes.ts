import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  createRecordingSchema,
  createSessionSchema,
  createLiveClassScheduleSchema,
  markAttendanceSchema,
  updateLiveClassScheduleSchema,
  updateSessionSchema,
} from '../../shared/schemas/liveclass.js'
import * as controller from './liveclass.controller.js'

export const sessionsRouter = Router()
export const liveClassSchedulesRouter = Router()
export const recordingsRouter = Router()
export const meLiveclassRouter = Router()

sessionsRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(createSessionSchema),
  controller.createSession,
)

sessionsRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(updateSessionSchema),
  controller.updateSession,
)

sessionsRouter.delete(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.deleteSession,
)

sessionsRouter.post(
  '/:id/attendance',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(markAttendanceSchema),
  controller.markAttendance,
)

liveClassSchedulesRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(createLiveClassScheduleSchema),
  controller.createLiveClassSchedule,
)

liveClassSchedulesRouter.patch(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(updateLiveClassScheduleSchema),
  controller.updateLiveClassSchedule,
)

liveClassSchedulesRouter.delete(
  '/:id',
  authenticate,
  requireRole(...ADMIN_ROLES),
  controller.deleteLiveClassSchedule,
)

recordingsRouter.post(
  '/',
  authenticate,
  requireRole(...ADMIN_ROLES),
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
    '/:id/live-classes',
    authenticate,
    controller.listBatchLiveClassSchedules,
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
    '/:id/live-classes',
    authenticate,
    controller.listCourseLiveClassSchedules,
  )
  courseRouter.get(
    '/:id/recordings',
    authenticate,
    requireRole(Role.STUDENT),
    controller.listCourseRecordings,
  )
}
