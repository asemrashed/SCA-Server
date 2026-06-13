import type { Certificate, Enrollment, Batch, Course, User } from '@prisma/client'
import { EnrollmentKind } from '../../shared/enums.js'

export type CertificateWithRelations = Certificate & {
  enrollment: Enrollment & {
    batch: Pick<Batch, 'id' | 'title'> | null
    course: Pick<Course, 'id' | 'title'> | null
  }
  student: Pick<User, 'id' | 'name'>
}

export interface CertificateListItemDto {
  id: string
  serial: string
  pdfUrl: string | null
  issuedAt: string
  enrollmentId: string
  kind: EnrollmentKind
  productTitle: string
  productId: string
  studentName: string
}

export interface CertificateDetailDto extends CertificateListItemDto {}

export interface CertificateVerifyDto {
  valid: true
  serial: string
  studentName: string
  productTitle: string
  kind: EnrollmentKind
  issuedAt: string
  pdfUrl: string | null
}

function productMeta(row: CertificateWithRelations): {
  kind: EnrollmentKind
  productTitle: string
  productId: string
} {
  if (row.enrollment.batchId && row.enrollment.batch) {
    return {
      kind: EnrollmentKind.BATCH,
      productTitle: row.enrollment.batch.title,
      productId: row.enrollment.batch.id,
    }
  }
  if (row.enrollment.courseId && row.enrollment.course) {
    return {
      kind: EnrollmentKind.COURSE,
      productTitle: row.enrollment.course.title,
      productId: row.enrollment.course.id,
    }
  }
  return { kind: EnrollmentKind.COURSE, productTitle: 'Unknown product', productId: '' }
}

export function toCertificateListItem(row: CertificateWithRelations): CertificateListItemDto {
  const product = productMeta(row)
  return {
    id: row.id,
    serial: row.serial,
    pdfUrl: row.pdfUrl,
    issuedAt: row.issuedAt.toISOString(),
    enrollmentId: row.enrollmentId,
    kind: product.kind,
    productTitle: product.productTitle,
    productId: product.productId,
    studentName: row.student.name,
  }
}

export function toCertificateVerify(row: CertificateWithRelations): CertificateVerifyDto {
  const item = toCertificateListItem(row)
  return {
    valid: true,
    serial: item.serial,
    studentName: item.studentName,
    productTitle: item.productTitle,
    kind: item.kind,
    issuedAt: item.issuedAt,
    pdfUrl: item.pdfUrl,
  }
}
