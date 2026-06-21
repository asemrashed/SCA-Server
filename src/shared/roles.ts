import { Role } from './enums.js'

/** Platform owner only. */
export const SUPER_ADMIN_ROLES = [Role.SUPER_ADMIN] as const

/** Day-to-day staff (normal admin + platform owner). */
export const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN] as const

/** All staff roles. */
export const STAFF_ROLES = ADMIN_ROLES

export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

export function isAdminStaff(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

export function isStaff(role: Role): boolean {
  return isAdminStaff(role)
}

export function isLoginAllowed(role: Role): boolean {
  return true
}
