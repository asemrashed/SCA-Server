import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import {
  createAssignmentSchema,
  createExamSchema,
  createPdfQuestionsBulkSchema,
  createQuestionSchema,
  createSubmissionSchema,
  gradeSubmissionSchema,
  questionListQuerySchema,
  updateAttemptSchema,
} from '../../shared/schemas/assessment.js'
import * as controller from './assessment.controller.js'

export const questionRouter = Router()
export const examRouter = Router()
export const attemptRouter = Router()
export const assignmentRouter = Router()
export const submissionRouter = Router()
export const batchExamRouter = Router({ mergeParams: true })
export const courseExamRouter = Router({ mergeParams: true })
export const batchAssignmentRouter = Router({ mergeParams: true })
export const courseAssignmentRouter = Router({ mergeParams: true })

const staffRoles = ADMIN_ROLES

questionRouter.get(
  '/',
  authenticate,
  requireRole(...staffRoles),
  validate(questionListQuerySchema, 'query'),
  controller.listQuestions,
)
questionRouter.post(
  '/',
  authenticate,
  requireRole(...staffRoles),
  validate(createQuestionSchema),
  controller.createQuestion,
)
questionRouter.post(
  '/pdf-bulk',
  authenticate,
  requireRole(...staffRoles),
  validate(createPdfQuestionsBulkSchema),
  controller.createPdfQuestionsBulk,
)

batchExamRouter.get('/', authenticate, controller.listBatchExams)
courseExamRouter.get('/', authenticate, controller.listCourseExams)

examRouter.post(
  '/',
  authenticate,
  requireRole(...staffRoles),
  validate(createExamSchema),
  controller.createExam,
)
examRouter.post(
  '/:examId/attempts',
  authenticate,
  requireRole(Role.STUDENT),
  controller.startAttempt,
)

attemptRouter.patch(
  '/:id',
  authenticate,
  requireRole(Role.STUDENT),
  validate(updateAttemptSchema),
  controller.updateAttempt,
)

batchAssignmentRouter.get('/', authenticate, controller.listBatchAssignments)
courseAssignmentRouter.get('/', authenticate, controller.listCourseAssignments)

assignmentRouter.post(
  '/',
  authenticate,
  requireRole(...staffRoles),
  validate(createAssignmentSchema),
  controller.createAssignment,
)
assignmentRouter.post(
  '/:id/submissions',
  authenticate,
  requireRole(Role.STUDENT),
  validate(createSubmissionSchema),
  controller.submitAssignment,
)

submissionRouter.patch(
  '/:id/grade',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(gradeSubmissionSchema),
  controller.gradeSubmission,
)
