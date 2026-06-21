import type { Resource } from '@prisma/client'
import { ResourceCategory, Role } from '../../shared/enums.js'

export interface ResourceDto {
  id: string
  title: string
  fileUrl: string | null
  fileType: string | null
  category: ResourceCategory
  courseId: string
  batchId: string | null
  subjectId: string | null
  moduleId: string | null
  lessonId: string | null
  deadlineAt: string | null
  startsAt: string | null
  marks: number | null
  linkedQuestionIds: string[]
  createdAt: string
}

function parseLinkedQuestionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

function shouldHideFileUrl(role: Role, fileType: string | null): boolean {
  if (role !== Role.STUDENT) return false
  return fileType !== 'link'
}

export function toResourceDto(row: Resource, role: Role): ResourceDto {
  const hideUrl = shouldHideFileUrl(role, row.fileType)
  return {
    id: row.id,
    title: row.title,
    fileUrl: hideUrl ? null : row.fileUrl,
    fileType: row.fileType,
    category: row.category as ResourceCategory,
    courseId: row.courseId,
    batchId: row.batchId,
    subjectId: row.subjectId,
    moduleId: row.moduleId,
    lessonId: row.lessonId,
    deadlineAt: row.deadlineAt?.toISOString() ?? null,
    startsAt: row.startsAt?.toISOString() ?? null,
    marks: row.marks,
    linkedQuestionIds: parseLinkedQuestionIds(row.linkedQuestionIds),
    createdAt: row.createdAt.toISOString(),
  }
}
