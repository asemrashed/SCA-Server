export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'item'
}

export async function generateUniqueSlug(
  baseSlug: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const normalized = baseSlug.slice(0, 120)
  if (!(await isTaken(normalized))) {
    return normalized
  }

  for (let n = 2; n <= 999; n++) {
    const suffix = `-${n}`
    const candidate = `${normalized.slice(0, 120 - suffix.length)}${suffix}`
    if (!(await isTaken(candidate))) {
      return candidate
    }
  }

  const fallback = `${normalized.slice(0, 100)}-${Date.now()}`
  return fallback.slice(0, 120)
}
