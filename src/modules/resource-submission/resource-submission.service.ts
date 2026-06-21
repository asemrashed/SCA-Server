import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/db.js'
import { adminWhatsappPhone } from '../../config/env.js'
import { conflict, forbidden, notFound, validationError } from '../../lib/errors.js'
import {
  EnrollmentStatus,
  ResourceCategory,
  ResourceSubmissionStatus,
  Role,
} from '../../shared/enums.js'
import { isAdminStaff } from '../../shared/roles.js'
import type {
  ListResourceSubmissionsQuery,
  ReviewResourceSubmissionInput,
  UploadResourceSubmissionResultInput,
} from '../../shared/schemas/resource-submission.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import { isEnrollmentPaymentBlocked } from '../monthly-payment/monthly-payment.utils.js'

export interface ResourceSubmissionStudentDto {
  id: string
  name: string
  phone: string
  rollNumber: string | null
}

export interface ResourceSubmissionResourceDto {
  id: string
  title: string
  category: ResourceCategory
  subjectId: string | null
  subjectTitle: string | null
  courseId: string
  courseTitle: string
  batchId: string | null
  batchTitle: string | null
}

export interface ResourceSubmissionEnrollmentDto {
  id: string
  rollNumber: string | null
  courseTitle: string
  batchTitle: string | null
}

export interface ResourceSubmissionDto {
  id: string
  status: ResourceSubmissionStatus
  submittedAt: string
  reviewedAt: string | null
  resultFileUrl: string | null
  resultPublishedAt: string | null
  student: ResourceSubmissionStudentDto
  enrollment: ResourceSubmissionEnrollmentDto
  resource: ResourceSubmissionResourceDto
}

export interface StudentResultDto {
  id: string
  resourceTitle: string
  resourceCategory: ResourceCategory
  subjectTitle: string | null
  resultPublishedAt: string
}

const submissionInclude = {
  student: { select: { id: true, name: true, phone: true } },
  enrollment: {
    select: {
      id: true,
      rollNumber: true,
      batchId: true,
      courseId: true,
      batch: {
        select: {
          id: true,
          title: true,
          course: { select: { id: true, title: true } },
        },
      },
      course: { select: { id: true, title: true } },
    },
  },
  resource: {
    select: {
      id: true,
      title: true,
      category: true,
      subjectId: true,
      courseId: true,
      batchId: true,
      subject: { select: { id: true, title: true } },
      course: { select: { id: true, title: true } },
      batch: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.ResourceSubmissionInclude

type SubmissionRow = Prisma.ResourceSubmissionGetPayload<{
  include: typeof submissionInclude
}>

function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880')) return digits
  if (digits.startsWith('0')) return `880${digits.slice(1)}`
  return digits
}

function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizeBdPhone(phone)}?text=${encodeURIComponent(message)}`
}

function buildSubmitMessage(
  category: ResourceCategory,
  resourceTitle: string,
  studentName: string,
  rollNumber: string | null,
  submissionId: string,
): string {
  const kind = category === ResourceCategory.EXAM ? 'exam' : 'assignment'
  const roll = rollNumber ? ` | Roll: ${rollNumber}` : ''
  return `Hello SCA, I am submitting my ${kind} "${resourceTitle}".\nStudent: ${studentName}${roll}\nRef: ${submissionId.slice(0, 8)}`
}

function toResourceDto(row: SubmissionRow['resource']): ResourceSubmissionResourceDto {
  return {
    id: row.id,
    title: row.title,
    category: row.category as ResourceCategory,
    subjectId: row.subjectId,
    subjectTitle: row.subject?.title ?? null,
    courseId: row.courseId,
    courseTitle: row.course.title,
    batchId: row.batchId,
    batchTitle: row.batch?.title ?? null,
  }
}

function toEnrollmentDto(row: SubmissionRow['enrollment']): ResourceSubmissionEnrollmentDto {
  if (row.batchId && row.batch) {
    return {
      id: row.id,
      rollNumber: row.rollNumber,
      courseTitle: row.batch.course.title,
      batchTitle: row.batch.title,
    }
  }
  return {
    id: row.id,
    rollNumber: row.rollNumber,
    courseTitle: row.course?.title ?? 'Course',
    batchTitle: null,
  }
}

function toSubmissionDto(row: SubmissionRow, role: Role): ResourceSubmissionDto {
  const hideResultUrl = role === Role.STUDENT && !row.resultPublishedAt
  return {
    id: row.id,
    status: row.status as ResourceSubmissionStatus,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    resultFileUrl: hideResultUrl ? null : row.resultFileUrl,
    resultPublishedAt: row.resultPublishedAt?.toISOString() ?? null,
    student: {
      id: row.student.id,
      name: row.student.name,
      phone: row.student.phone,
      rollNumber: row.enrollment.rollNumber,
    },
    enrollment: toEnrollmentDto(row.enrollment),
    resource: toResourceDto(row.resource),
  }
}

async function getActiveEnrollmentForStudent(studentId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      studentId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    },
    select: { id: true, studentId: true, rollNumber: true, batchId: true },
  })
  if (!enrollment) {
    throw notFound('Enrollment not found')
  }
  if (await isEnrollmentPaymentBlocked(enrollment.id, enrollment.batchId)) {
    throw forbidden('Course access is blocked until this month\'s fee is paid')
  }
  return enrollment
}

async function loadSubmission(id: string): Promise<SubmissionRow> {
  const row = await prisma.resourceSubmission.findUnique({
    where: { id },
    include: submissionInclude,
  })
  if (!row) {
    throw notFound('Submission not found')
  }
  return row
}

function buildListWhere(query: ListResourceSubmissionsQuery): Prisma.ResourceSubmissionWhereInput {
  const where: Prisma.ResourceSubmissionWhereInput = {
    resource: {
      category: query.category,
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.batchId ? { batchId: query.batchId } : {}),
    },
  }

  if (query.status) {
    where.status = query.status
  }

  if (query.hasResult === true) {
    where.resultFileUrl = { not: null }
  } else if (query.hasResult === false) {
    where.resultFileUrl = null
  }

  if (query.search?.trim()) {
    const term = query.search.trim()
    where.OR = [
      { student: { name: { contains: term, mode: 'insensitive' } } },
      { student: { phone: { contains: term } } },
      { enrollment: { rollNumber: { contains: term, mode: 'insensitive' } } },
      { resource: { title: { contains: term, mode: 'insensitive' } } },
    ]
  }

  return where
}

export async function submitResource(
  studentId: string,
  enrollmentId: string,
  resourceId: string,
): Promise<{ submission: ResourceSubmissionDto; whatsappUrl: string }> {
  const enrollment = await getActiveEnrollmentForStudent(studentId, enrollmentId)

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, title: true, category: true, courseId: true, batchId: true, deadlineAt: true },
  })
  if (!resource) {
    throw notFound('Resource not found')
  }
  if (
    resource.category !== ResourceCategory.EXAM &&
    resource.category !== ResourceCategory.ASSIGNMENT
  ) {
    throw validationError('Only exams and assignments can be submitted')
  }

  const enrollmentCourse = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { courseId: true, batchId: true, batch: { select: { courseId: true } } },
  })
  const enrolledCourseId = enrollmentCourse?.courseId ?? enrollmentCourse?.batch?.courseId
  if (enrolledCourseId !== resource.courseId) {
    throw forbidden('This resource does not belong to your enrollment')
  }
  if (resource.batchId && enrollmentCourse?.batchId !== resource.batchId) {
    throw forbidden('This resource does not belong to your batch')
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true },
  })
  if (!student) {
    throw notFound('User not found')
  }

  const existing = await prisma.resourceSubmission.findUnique({
    where: {
      resourceId_enrollmentId: { resourceId, enrollmentId },
    },
    include: submissionInclude,
  })

  if (existing?.status === ResourceSubmissionStatus.ACCEPTED) {
    throw conflict('This submission was already accepted')
  }

  let row: SubmissionRow
  if (existing) {
    row = await prisma.resourceSubmission.update({
      where: { id: existing.id },
      data: {
        status: ResourceSubmissionStatus.PENDING,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        resultFileUrl: null,
        resultPublishedAt: null,
      },
      include: submissionInclude,
    })
  } else {
    row = await prisma.resourceSubmission.create({
      data: {
        resourceId,
        enrollmentId,
        studentId,
      },
      include: submissionInclude,
    })
  }

  const whatsappUrl = buildWhatsAppUrl(
    adminWhatsappPhone(),
    buildSubmitMessage(
      resource.category as ResourceCategory,
      resource.title,
      student.name,
      enrollment.rollNumber,
      row.id,
    ),
  )

  return {
    submission: toSubmissionDto(row, Role.STUDENT),
    whatsappUrl,
  }
}

export async function listSubmissionsForEnrollment(
  studentId: string,
  enrollmentId: string,
  category: ResourceCategory,
): Promise<ResourceSubmissionDto[]> {
  await getActiveEnrollmentForStudent(studentId, enrollmentId)

  const rows = await prisma.resourceSubmission.findMany({
    where: {
      enrollmentId,
      studentId,
      resource: { category },
    },
    include: submissionInclude,
    orderBy: { submittedAt: 'desc' },
  })

  return rows.map((row) => toSubmissionDto(row, Role.STUDENT))
}

export async function listStudentResults(
  studentId: string,
  enrollmentId: string,
): Promise<StudentResultDto[]> {
  await getActiveEnrollmentForStudent(studentId, enrollmentId)

  const rows = await prisma.resourceSubmission.findMany({
    where: {
      enrollmentId,
      studentId,
      resultFileUrl: { not: null },
      resultPublishedAt: { not: null },
    },
    include: {
      resource: {
        select: {
          title: true,
          category: true,
          subject: { select: { title: true } },
        },
      },
    },
    orderBy: { resultPublishedAt: 'desc' },
  })

  return rows.map((row) => ({
    id: row.id,
    resourceTitle: row.resource.title,
    resourceCategory: row.resource.category as ResourceCategory,
    subjectTitle: row.resource.subject?.title ?? null,
    resultPublishedAt: row.resultPublishedAt!.toISOString(),
  }))
}

export async function listAdminSubmissions(
  query: ListResourceSubmissionsQuery,
): Promise<ApiListResponse<ResourceSubmissionDto>> {
  const where = buildListWhere(query)

  const [total, rows] = await Promise.all([
    prisma.resourceSubmission.count({ where }),
    prisma.resourceSubmission.findMany({
      where,
      include: submissionInclude,
      orderBy: { submittedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    data: rows.map((row) => toSubmissionDto(row, Role.ADMIN)),
    meta: { page: query.page, pageSize: query.pageSize, total },
  }
}

export async function reviewSubmission(
  reviewerId: string,
  submissionId: string,
  input: ReviewResourceSubmissionInput,
): Promise<ResourceSubmissionDto> {
  const existing = await loadSubmission(submissionId)

  if (existing.status !== ResourceSubmissionStatus.PENDING) {
    throw conflict('Only pending submissions can be reviewed')
  }

  const status =
    input.action === 'accept'
      ? ResourceSubmissionStatus.ACCEPTED
      : ResourceSubmissionStatus.REJECTED

  const row = await prisma.resourceSubmission.update({
    where: { id: submissionId },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedById: reviewerId,
    },
    include: submissionInclude,
  })

  return toSubmissionDto(row, Role.ADMIN)
}

export async function uploadSubmissionResult(
  reviewerId: string,
  submissionId: string,
  input: UploadResourceSubmissionResultInput,
): Promise<ResourceSubmissionDto> {
  const existing = await loadSubmission(submissionId)

  if (existing.status !== ResourceSubmissionStatus.ACCEPTED) {
    throw validationError('Result can only be uploaded for accepted submissions')
  }

  const row = await prisma.resourceSubmission.update({
    where: { id: submissionId },
    data: {
      resultFileUrl: input.resultFileUrl,
      resultPublishedAt: new Date(),
      reviewedById: reviewerId,
      reviewedAt: existing.reviewedAt ?? new Date(),
    },
    include: submissionInclude,
  })

  return toSubmissionDto(row, Role.ADMIN)
}

export async function streamSubmissionResult(
  userId: string,
  role: Role,
  submissionId: string,
): Promise<{ buffer: Buffer; contentType: string; title: string }> {
  const row = await loadSubmission(submissionId)

  if (!row.resultFileUrl || !row.resultPublishedAt) {
    throw notFound('Result not published yet')
  }

  if (role === Role.STUDENT) {
    if (row.studentId !== userId) {
      throw forbidden()
    }
    await getActiveEnrollmentForStudent(userId, row.enrollmentId)
  } else if (!isAdminStaff(role)) {
    throw forbidden()
  }

  const upstream = await fetch(row.resultFileUrl)
  if (!upstream.ok) {
    throw notFound('Result file could not be loaded from storage')
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get('content-type') ?? 'application/pdf'

  return {
    buffer,
    contentType,
    title: `${row.resource.title} — Result`,
  }
}
