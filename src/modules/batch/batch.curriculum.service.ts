import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { notFound, validationError } from '../../lib/errors.js'
import { subjectInputSchema } from '../../shared/schemas/course.js'
import type {
  applyBatchCurriculumSchema,
} from '../../shared/schemas/batch-curriculum.js'
import {
  toCurriculumSubjects,
  type CurriculumSubjectDto,
} from './batch.curriculum.mapper.js'

type SubjectInput = z.infer<typeof subjectInputSchema>
type ApplyBatchCurriculumInput = z.infer<typeof applyBatchCurriculumSchema>

function parseLectureDate(value: string | null | undefined): Date | null {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`)
}

const subjectTreeInclude = {
  modules: {
    orderBy: { order: 'asc' as const },
    include: {
      lessons: { orderBy: { order: 'asc' as const } },
    },
  },
} satisfies Prisma.SubjectInclude

export async function getBatchCurriculum(batchId: string): Promise<CurriculumSubjectDto[]> {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, deletedAt: null },
    include: {
      subjects: {
        orderBy: { order: 'asc' as const },
        include: subjectTreeInclude,
      },
    },
  })
  if (!batch) {
    throw notFound('Batch not found')
  }
  return toCurriculumSubjects(batch.subjects)
}

async function createSubjectsForBatch(batchId: string, subjects: SubjectInput[]): Promise<void> {
  for (const subject of subjects) {
    const createdSubject = await prisma.subject.create({
      data: { batchId, title: subject.title, order: subject.order },
    })
    if (!subject.modules?.length) continue
    for (const mod of subject.modules) {
      const createdModule = await prisma.module.create({
        data: { subjectId: createdSubject.id, title: mod.title, order: mod.order },
      })
      if (mod.lessons?.length) {
        await prisma.lesson.createMany({
          data: mod.lessons.map((lesson) => ({
            moduleId: createdModule.id,
            title: lesson.title,
            type: lesson.type,
            videoUrl: lesson.videoUrl ?? null,
            content: lesson.content ?? null,
            durationS: lesson.durationS ?? null,
            order: lesson.order,
            isPreview: lesson.isPreview,
            lectureDate: parseLectureDate(lesson.lectureDate),
          })),
        })
      }
    }
  }
}

async function clearBatchCurriculum(batchId: string): Promise<void> {
  await prisma.subject.deleteMany({ where: { batchId } })
}

export async function replaceBatchCurriculum(
  batchId: string,
  subjects: SubjectInput[],
): Promise<CurriculumSubjectDto[]> {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, deletedAt: null } })
  if (!batch) {
    throw notFound('Batch not found')
  }
  await clearBatchCurriculum(batchId)
  if (subjects.length) {
    await createSubjectsForBatch(batchId, subjects)
  }
  return getBatchCurriculum(batchId)
}

export async function applyCurriculumToBatches(
  courseId: string,
  input: ApplyBatchCurriculumInput,
): Promise<void> {
  const batches = await prisma.batch.findMany({
    where: { id: { in: input.batchIds }, courseId, deletedAt: null },
    select: { id: true },
  })
  if (batches.length !== input.batchIds.length) {
    throw validationError('One or more batch IDs are invalid for this course')
  }

  for (const batch of batches) {
    await replaceBatchCurriculum(batch.id, input.subjects)
  }
}

export async function loadSubjectsForBatchIds(batchIds: string[]) {
  if (!batchIds.length) return []
  return prisma.subject.findMany({
    where: { batchId: { in: batchIds } },
    orderBy: { order: 'asc' },
    include: subjectTreeInclude,
  })
}
