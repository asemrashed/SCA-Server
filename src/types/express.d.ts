import type { Role } from '../shared/enums.js'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string
        role: Role
      }
    }
  }
}

export {}
