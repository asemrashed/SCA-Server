import type { Category } from '@prisma/client'

export interface CategoryListItem {
  id: string
  title: string
  slug: string
  shortIntro: string | null
  image: string | null
  order: number
  courseCount: number
}

export interface CategoryDetailDto extends CategoryListItem {
  createdAt: string
  updatedAt: string
}

type CategoryWithCount = Category & { _count: { courses: number } }

export function toCategoryListItem(row: CategoryWithCount): CategoryListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortIntro: row.shortIntro,
    image: row.image,
    order: row.order,
    courseCount: row._count.courses,
  }
}

export function toCategoryDetail(row: CategoryWithCount): CategoryDetailDto {
  return {
    ...toCategoryListItem(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
