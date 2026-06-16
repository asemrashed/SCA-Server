import { prisma } from '../../config/db.js'
import { forbidden } from '../../lib/errors.js'
import { EnrollmentStatus } from '../../shared/enums.js'

const activeStatuses = [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED]

/** Student may view course-scoped content via direct course enrollment or any batch under the course. */
export async function assertStudentCourseContentAccess(
  studentId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      status: { in: activeStatuses },
      OR: [{ courseId }, { batch: { courseId } }],
    },
  })
  if (!enrollment) {
    throw forbidden('Not enrolled in this content')
  }
}

export async function isStudentCourseContentAccess(
  studentId: string,
  courseId: string,
): Promise<boolean> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      status: { in: activeStatuses },
      OR: [{ courseId }, { batch: { courseId } }],
    },
  })
  return !!enrollment
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
