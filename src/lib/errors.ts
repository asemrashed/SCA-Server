import { ErrorCode } from '../shared/enums.js'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: { field: string; issue: string }[],
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(ErrorCode.NOT_FOUND, message, 404)
}

export function validationError(
  message: string,
  details?: { field: string; issue: string }[],
): AppError {
  return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details)
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(ErrorCode.UNAUTHENTICATED, message, 401)
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(ErrorCode.FORBIDDEN, message, 403)
}

export function conflict(message: string): AppError {
  return new AppError(ErrorCode.CONFLICT, message, 409)
}

export function internal(message = 'Internal server error'): AppError {
  return new AppError(ErrorCode.INTERNAL, message, 500)
}
