const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration)
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`)
  }
  return parseInt(match[1], 10) * UNIT_MS[match[2]]
}

export function addDuration(from: Date, duration: string): Date {
  return new Date(from.getTime() + parseDurationMs(duration))
}
