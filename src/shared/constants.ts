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

/** Max multipart upload size (1 GiB). Keep in sync with nginx client_max_body_size. */
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024

export const ROLE_LIST = ['STUDENT', 'ADMIN', 'SUPER_ADMIN'] as const
