import { z } from 'zod'

export const issueCertificateSchema = z.object({
  enrollmentId: z.string().min(1),
})
