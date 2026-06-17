import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, notFound } from '../../lib/errors.js'
import {
  createCategorySchema,
  categoryListQuerySchema,
  updateCategorySchema,
} from '../../shared/schemas/category.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  toCategoryDetail,
  toCategoryListItem,
  type CategoryDetailDto,
  type CategoryListItem,
} from './category.mapper.js'

type CreateCategoryInput = z.infer<typeof createCategorySchema>
type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
type CategoryListQuery = z.infer<typeof categoryListQuerySchema>

const categoryInclude = {
  _count: {
    select: {
      courses: {
        where: { deletedAt: null, isPublished: true },
      },
    },
  },
} satisfies Prisma.CategoryInclude

function parseSort(sort?: string): Prisma.CategoryOrderByWithRelationInput {
  if (!sort) return { order: 'asc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['order', 'title', 'createdAt', 'updatedAt'])
  if (!allowed.has(field)) return { order: 'asc' }
  return { [field]: dir === 'desc' ? 'desc' : 'asc' }
}

export async function listCategories(
  query: CategoryListQuery,
): Promise<ApiListResponse<CategoryListItem>> {
  const { page, pageSize, search, sort } = query
  const where: Prisma.CategoryWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { shortIntro: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: parseSort(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: categoryInclude,
    }),
    prisma.category.count({ where }),
  ])

  return {
    data: rows.map(toCategoryListItem),
    meta: { page, pageSize, total },
  }
}

export async function getCategoryByIdOrSlug(idOrSlug: string): Promise<CategoryDetailDto> {
  const category = await prisma.category.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: categoryInclude,
  })
  if (!category) {
    throw notFound('Category not found')
  }
  return toCategoryDetail(category)
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryDetailDto> {
  const existing = await prisma.category.findFirst({
    where: { slug: input.slug, deletedAt: null },
  })
  if (existing) {
    throw conflict('Category slug already exists')
  }

  const category = await prisma.category.create({
    data: input,
    include: categoryInclude,
  })
  return toCategoryDetail(category)
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDetailDto> {
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
  })
  if (!category) {
    throw notFound('Category not found')
  }

  if (input.slug && input.slug !== category.slug) {
    const slugTaken = await prisma.category.findFirst({
      where: { slug: input.slug, deletedAt: null, id: { not: id } },
    })
    if (slugTaken) {
      throw conflict('Category slug already exists')
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: input,
    include: categoryInclude,
  })
  return toCategoryDetail(updated)
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
  })
  if (!category) {
    throw notFound('Category not found')
  }

  await prisma.$transaction([
    prisma.course.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    }),
    prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ])
}
