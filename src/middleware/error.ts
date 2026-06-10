import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ErrorCode } from '../shared/enums.js'
import { AppError } from '../lib/errors.js'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          issue: issue.message,
        })),
      },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL,
      message: 'Internal server error',
    },
  })
}
