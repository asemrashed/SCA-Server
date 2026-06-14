/** BDT minor units (poisha). ৳1,500.00 → 150000 */
export function toMinor(major: number): number {
  return Math.round(major * 100)
}

export function fromMinor(minor: number): number {
  return minor / 100
}

export function formatBDT(minor: number): string {
  const major = fromMinor(minor)
  return `৳${major.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export const DEFAULT_PAGE_SIZE = 20

export const ROLE_LIST = ['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'] as const
