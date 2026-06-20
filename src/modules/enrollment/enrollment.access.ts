import { prisma } from '../../config/db.js'
import { forbidden } from '../../lib/errors.js'
import { EnrollmentStatus } from '../../shared/enums.js'
import { isEnrollmentPaymentBlocked } from '../monthly-payment/monthly-payment.utils.js'

const activeStatuses = [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]

async function findActiveEnrollmentForCourse(studentId: string, courseId: string) {
  return prisma.enrollment.findFirst({
    where: {
      studentId,
      status: { in: activeStatuses },
      OR: [{ courseId }, { batch: { courseId } }],
    },
    select: { id: true, batchId: true },
  })
}

/** Student may view course-scoped content via direct course enrollment or any batch under the course. */
export async function assertStudentCourseContentAccess(
  studentId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await findActiveEnrollmentForCourse(studentId, courseId)
  if (!enrollment) {
    throw forbidden('Not enrolled in this content')
  }
  if (await isEnrollmentPaymentBlocked(enrollment.id, enrollment.batchId)) {
    throw forbidden('Course access is blocked until this month\'s fee is paid')
  }
}

export async function isStudentCourseContentAccess(
  studentId: string,
  courseId: string,
): Promise<boolean> {
  const enrollment = await findActiveEnrollmentForCourse(studentId, courseId)
  if (!enrollment) return false
  if (await isEnrollmentPaymentBlocked(enrollment.id, enrollment.batchId)) {
    return false
  }
  return true
}

/** Batches whose recordings/sessions a receiving batch may also access. */
export async function getGrantedSourceBatchIds(receivingBatchId: string): Promise<string[]> {
  const grants = await prisma.batchContentGrant.findMany({
    where: { receivingBatchId },
    select: { grantingBatchId: true },
  })
  return grants.map((g) => g.grantingBatchId)
}

export async function getAccessibleBatchIds(receivingBatchId: string): Promise<string[]> {
  const granted = await getGrantedSourceBatchIds(receivingBatchId)
  return [receivingBatchId, ...granted]
}
