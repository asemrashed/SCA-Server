import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { ErrorCode } from '../shared/enums.js'
import { AppError } from '../lib/errors.js'
import { MAX_UPLOAD_BYTES } from '../shared/constants.js'

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

  if (err instanceof MulterError) {
    const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum upload size is ${maxMb} MB.`
        : err.message
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message,
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
