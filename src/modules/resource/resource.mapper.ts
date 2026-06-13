import type { Resource } from '@prisma/client'

export interface ResourceDto {
  id: string
  title: string
  fileUrl: string
  fileType: string | null
  batchId: string | null
  courseId: string | null
  moduleId: string | null
  lessonId: string | null
  createdAt: string
}

export function toResourceDto(row: Resource): ResourceDto {
  return {
    id: row.id,
    title: row.title,
    fileUrl: row.fileUrl,
    fileType: row.fileType,
    batchId: row.batchId,
    courseId: row.courseId,
    moduleId: row.moduleId,
    lessonId: row.lessonId,
    createdAt: row.createdAt.toISOString(),
  }
}
