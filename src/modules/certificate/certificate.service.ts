import { randomBytes } from 'node:crypto'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import { storage } from '../../lib/storage.js'
import { EnrollmentStatus, Role } from '../../shared/enums.js'
import { isAdminStaff } from '../../shared/roles.js'
import type { issueCertificateSchema } from '../../shared/schemas/certificate.js'
import { generateCertificatePdf } from './certificate.pdf.js'
import {
  toCertificateListItem,
  toCertificateVerify,
  type CertificateDetailDto,
  type CertificateListItemDto,
  type CertificateVerifyDto,
  type CertificateWithRelations,
} from './certificate.mapper.js'

type IssueCertificateInput = z.infer<typeof issueCertificateSchema>

const certificateInclude = {
  student: { select: { id: true, name: true } },
  enrollment: {
    include: {
      batch: { select: { id: true, title: true } },
      course: { select: { id: true, title: true } },
    },
  },
} as const

function generateSerial(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = randomBytes(3).toString('hex').toUpperCase()
  return `SCA-${stamp}-${suffix}`
}

async function assertCanIssue(
  userId: string,
  role: Role,
  enrollment: {
    batchId: string | null
    courseId: string | null
  },
): Promise<void> {
  if (isAdminStaff(role)) return

  if (enrollment.batchId) {
    const assigned = await prisma.batchInstructor.findFirst({
      where: { batchId: enrollment.batchId, instructorId: userId },
    })
    if (!assigned) {
      throw forbidden('Not assigned to this batch')
    }
    return
  }

  if (role === Role.INSTRUCTOR) return

  throw forbidden('Not allowed to issue certificates')
}

function assertCompleted(enrollment: {
  status: string
  progressPct: number
}): void {
  if (
    enrollment.status !== EnrollmentStatus.COMPLETED &&
    enrollment.progressPct < 100
  ) {
    throw validationError('Enrollment must be completed before issuing a certificate')
  }
}

function productTitle(enrollment: CertificateWithRelations['enrollment']): string {
  if (enrollment.batch) return enrollment.batch.title
  if (enrollment.course) return enrollment.course.title
  return 'Program'
}

export async function listMyCertificates(studentId: string): Promise<CertificateListItemDto[]> {
  const rows = await prisma.certificate.findMany({
    where: { studentId },
    include: certificateInclude,
    orderBy: { issuedAt: 'desc' },
  })
  return rows.map((row) => toCertificateListItem(row as CertificateWithRelations))
}

export async function issueCertificate(
  userId: string,
  role: Role,
  input: IssueCertificateInput,
): Promise<CertificateDetailDto> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: input.enrollmentId },
    include: {
      certificate: true,
      student: { select: { id: true, name: true } },
      batch: { select: { id: true, title: true } },
      course: { select: { id: true, title: true } },
    },
  })

  if (!enrollment) {
    throw notFound('Enrollment not found')
  }

  await assertCanIssue(userId, role, enrollment)
  assertCompleted(enrollment)

  if (enrollment.certificate) {
    throw conflict('Certificate already issued for this enrollment')
  }

  const title = productTitle(enrollment)
  const issuedAt = new Date()
  const serial = generateSerial()

  const pdfBuffer = await generateCertificatePdf({
    studentName: enrollment.student.name,
    productTitle: title,
    issuedAt,
    serial,
  })

  const upload = await storage.upload(
    `certificates/${serial}.pdf`,
    pdfBuffer,
    'application/pdf',
  )

  const created = await prisma.certificate.create({
    data: {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      serial,
      pdfUrl: upload.url,
      issuedAt,
    },
    include: certificateInclude,
  })

  return toCertificateListItem(created as CertificateWithRelations)
}

export async function verifyCertificate(serial: string): Promise<CertificateVerifyDto> {
  const row = await prisma.certificate.findUnique({
    where: { serial },
    include: certificateInclude,
  })

  if (!row) {
    throw notFound('Certificate not found')
  }

  return toCertificateVerify(row as CertificateWithRelations)
}
