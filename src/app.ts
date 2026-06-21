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
  adminEnrollmentRouter,
} from './modules/enrollment/enrollment.routes.js'
import { resourceRouter } from './modules/resource/resource.routes.js'
import {
  meLiveclassRouter,
  liveClassSchedulesRouter,
  recordingsRouter,
  sessionsRouter,
} from './modules/liveclass/liveclass.routes.js'
import { uploadRouter } from './modules/upload/upload.routes.js'
import {
  adminMonthlyPaymentRouter,
  meMonthlyPaymentRouter,
} from './modules/monthly-payment/monthly-payment.routes.js'
import { adminUserRouter } from './modules/admin-user/admin-user.routes.js'
import {
  adminOrderRouter,
  meOrderRouter,
  orderRouter,
  productRouter,
} from './modules/shop/shop.routes.js'
import { categoryRouter } from './modules/category/category.routes.js'
import {
  adminReviewRouter,
  meReviewRouter,
  reviewRouter,
} from './modules/review/review.routes.js'
import {
  adminResourceSubmissionRouter,
  meResourceSubmissionRouter,
} from './modules/resource-submission/resource-submission.routes.js'

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
  api.use('/batches', batchRouter)
  api.use('/courses', courseRouter)
  api.use('/sessions', sessionsRouter)
  api.use('/live-classes', liveClassSchedulesRouter)
  api.use('/recordings', recordingsRouter)
  api.use('/enrollments', enrollmentRouter)
  api.use('/admin/enrollments', adminEnrollmentRouter)
  api.use('/admin/users', adminUserRouter)
  api.use('/me', meEnrollmentRouter)
  api.use('/me', meMonthlyPaymentRouter)
  api.use('/me', meResourceSubmissionRouter)
  api.use('/resources', resourceRouter)
  api.use('/uploads', uploadRouter)
  api.use('/me', meLiveclassRouter)
  api.use('/products', productRouter)
  api.use('/categories', categoryRouter)
  api.use('/orders', orderRouter)
  api.use('/me', meOrderRouter)
  api.use('/admin/orders', adminOrderRouter)
  api.use('/admin/monthly-payments', adminMonthlyPaymentRouter)
  api.use('/admin/resource-submissions', adminResourceSubmissionRouter)
  api.use('/admin/reviews', adminReviewRouter)
  api.use('/reviews', reviewRouter)
  api.use('/me', meReviewRouter)

  app.use('/api', api)

  app.use(errorHandler)

  return app
}

/** Vercel serverless entry — must default-export the Express app (no app.listen here). */
export default createApp()
