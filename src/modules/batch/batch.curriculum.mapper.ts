import type { Lesson, Module, Subject } from '@prisma/client'
import type { LessonType } from '../../shared/enums.js'
import { lessonVisibilityFields } from '../../shared/lesson-visibility.js'

type LessonRow = Lesson
type ModuleWithLessons = Module & { lessons: LessonRow[] }
type SubjectWithModules = Subject & { modules: ModuleWithLessons[] }

export interface CurriculumLessonDto {
  id: string
  title: string
  type: LessonType
  durationS: number | null
  lectureDate: string | null
  order: number
  isPreview: boolean
  hasVideo: boolean
  hasDocument: boolean
  videoUrl?: string | null
  content?: string | null
}

function formatLectureDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface CurriculumModuleDto {
  id: string
  title: string
  order: number
  lessons: CurriculumLessonDto[]
}

export interface CurriculumSubjectDto {
  id: string
  title: string
  order: number
  modules: CurriculumModuleDto[]
}

export function toCurriculumSubjects(
  subjects: SubjectWithModules[],
  includeProtectedFields = false,
): CurriculumSubjectDto[] {
  return subjects.map((subject) => ({
    id: subject.id,
    title: subject.title,
    order: subject.order,
    modules: subject.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: mod.lessons.map((lesson) => {
        const canAccessContent = includeProtectedFields || lesson.isPreview
        const visibility = lessonVisibilityFields(lesson, canAccessContent)

        const base: CurriculumLessonDto = {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type as LessonType,
          durationS: lesson.durationS,
          lectureDate: lesson.lectureDate ? formatLectureDate(lesson.lectureDate) : null,
          order: lesson.order,
          isPreview: lesson.isPreview,
          hasVideo: visibility.hasVideo,
          hasDocument: visibility.hasDocument,
          content: visibility.content,
        }

        if (includeProtectedFields) {
          return {
            ...base,
            videoUrl: lesson.videoUrl,
            content: lesson.content,
          }
        }

        return base
      }),
    })),
  }))
}
