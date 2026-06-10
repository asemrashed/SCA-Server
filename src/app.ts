import express from 'express'
import cors from 'cors'
import { default as helmet } from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error.js'
import { authRouter } from './modules/auth/auth.routes.js'

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

  app.use('/api', api)

  app.use(errorHandler)

  return app
}
