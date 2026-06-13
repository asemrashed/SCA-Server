import { createRequire } from 'node:module'
import type { RequestHandler } from 'express'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const require = createRequire(import.meta.url)
const helmet = require('helmet') as () => RequestHandler
import { env } from './config/env.js'
import { errorHandler } from './middleware/error.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { batchRouter } from './modules/batch/batch.routes.js'
import { courseRouter } from './modules/course/course.routes.js'
import {
  enrollmentRouter,
  meEnrollmentRouter,
} from './modules/enrollment/enrollment.routes.js'
import { resourceRouter } from './modules/resource/resource.routes.js'
import {
  meLiveclassRouter,
  recordingsRouter,
  sessionsRouter,
} from './modules/liveclass/liveclass.routes.js'
import { uploadRouter } from './modules/upload/upload.routes.js'
import {
  assignmentRouter,
  attemptRouter,
  batchAssignmentRouter,
  batchExamRouter,
  courseAssignmentRouter,
  courseExamRouter,
  examRouter,
  questionRouter,
  submissionRouter,
} from './modules/assessment/assessment.routes.js'
import {
  mePaymentRouter,
  paymentRouter,
} from './modules/payment/payment.routes.js'
import {
  certificateRouter,
  meCertificateRouter,
} from './modules/certificate/certificate.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())

  const api = express.Router()

  api.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok' } })
  })

  api.use('/auth', authRouter)

  const batchesApi = express.Router()
  batchesApi.use('/:batchId/exams', batchExamRouter)
  batchesApi.use('/:batchId/assignments', batchAssignmentRouter)
  batchesApi.use('/', batchRouter)
  api.use('/batches', batchesApi)

  const coursesApi = express.Router()
  coursesApi.use('/:courseId/exams', courseExamRouter)
  coursesApi.use('/:courseId/assignments', courseAssignmentRouter)
  coursesApi.use('/', courseRouter)
  api.use('/courses', coursesApi)

  api.use('/questions', questionRouter)
  api.use('/exams', examRouter)
  api.use('/attempts', attemptRouter)
  api.use('/assignments', assignmentRouter)
  api.use('/submissions', submissionRouter)
  api.use('/sessions', sessionsRouter)
  api.use('/recordings', recordingsRouter)
  api.use('/enrollments', enrollmentRouter)
  api.use('/me', meEnrollmentRouter)
  api.use('/resources', resourceRouter)
  api.use('/uploads', uploadRouter)
  api.use('/payments', paymentRouter)
  api.use('/me', mePaymentRouter)
  api.use('/me', meLiveclassRouter)
  api.use('/me', meCertificateRouter)
  api.use('/certificates', certificateRouter)

  app.use('/api', api)

  app.use(errorHandler)

  return app
}

/** Vercel serverless entry — must default-export the Express app (no app.listen here). */
export default createApp()
