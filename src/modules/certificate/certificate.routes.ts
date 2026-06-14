import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/rbac.js'
import { validate } from '../../middleware/validate.js'
import { Role } from '../../shared/enums.js'
import { ADMIN_ROLES } from '../../shared/roles.js'
import { issueCertificateSchema } from '../../shared/schemas/certificate.js'
import * as controller from './certificate.controller.js'

export const certificateRouter = Router()
export const meCertificateRouter = Router()

meCertificateRouter.get(
  '/certificates',
  authenticate,
  requireRole(Role.STUDENT),
  controller.listMine,
)

certificateRouter.post(
  '/issue',
  authenticate,
  requireRole(...ADMIN_ROLES),
  validate(issueCertificateSchema),
  controller.issue,
)

certificateRouter.get('/verify/:serial', controller.verify)
