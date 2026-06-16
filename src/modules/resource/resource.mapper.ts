import type { Resource } from '@prisma/client'
import { ResourceCategory, Role } from '../../shared/enums.js'

export interface ResourceDto {
  id: string
  title: string
  fileUrl: string | null
  fileType: string | null
  category: ResourceCategory
  courseId: string
  subjectId: string | null
  moduleId: string | null
  lessonId: string | null
  createdAt: string
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
    subjectId: row.subjectId,
    moduleId: row.moduleId,
    lessonId: row.lessonId,
    createdAt: row.createdAt.toISOString(),
  }
}
