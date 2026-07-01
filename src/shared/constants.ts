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

/** Max multipart upload size for PDFs, videos, and general files (1 GiB). Keep in sync with nginx. */
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024

/** Max upload size for thumbnails and other images (50 MiB). */
export const MAX_IMAGE_UPLOAD_BYTES = 50 * 1024 * 1024

export type UploadFolderName = 'images' | 'videos' | 'documents' | 'files'

export function maxBytesForUploadFolder(folder: string): number {
  if (folder === 'images') return MAX_IMAGE_UPLOAD_BYTES
  return MAX_UPLOAD_BYTES
}

export const ROLE_LIST = ['STUDENT', 'ADMIN', 'SUPER_ADMIN'] as const
