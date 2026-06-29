const BD_E164_REGEX = /^\+8801[3-9]\d{8}$/

/** Normalize BD mobile input to E.164 (+8801XXXXXXXXX). */
export function normalizeBdPhone(phone: string): string {
  const trimmed = phone.trim()
  if (BD_E164_REGEX.test(trimmed)) {
    return trimmed
  }

  const digits = trimmed.replace(/\D/g, '')
  if (/^8801[3-9]\d{8}$/.test(digits)) {
    return `+${digits}`
  }
  if (/^01[3-9]\d{8}$/.test(digits)) {
    return `+88${digits}`
  }
  if (/^1[3-9]\d{8}$/.test(digits)) {
    return `+880${digits}`
  }

  return trimmed
}

export function isBdE164Phone(phone: string): boolean {
  return BD_E164_REGEX.test(phone)
}

/** Common stored variants for the same BD mobile number. */
export function bdPhoneLookupVariants(phone: string): string[] {
  const normalized = normalizeBdPhone(phone)
  const digits = normalized.replace(/\D/g, '')
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : phone.trim()
  const withoutPlus = normalized.startsWith('+') ? normalized.slice(1) : normalized

  return [...new Set([phone.trim(), normalized, local, withoutPlus].filter(Boolean))]
}
