import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'
import { validationError } from '../lib/errors.js'

type RequestSource = 'body' | 'query'

export function validate<T>(schema: ZodSchema<T>, source: RequestSource = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query)
    if (!result.success) {
      next(
        validationError(
          'Validation failed',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            issue: issue.message,
          })),
        ),
      )
      return
    }

    if (source === 'body') {
      req.body = result.data
    } else {
      req.query = result.data as typeof req.query
    }
    next()
  }
}
