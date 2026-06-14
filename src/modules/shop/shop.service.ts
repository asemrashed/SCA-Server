import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../config/db.js'
import { conflict, notFound, validationError } from '../../lib/errors.js'
import { OrderStatus } from '../../shared/enums.js'
import {
  createOrderSchema,
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
  reviewOrderSchema,
} from '../../shared/schemas/shop.js'
import type { ApiListResponse } from '../../shared/types/index.js'
import {
  toAdminOrderRequest,
  toOrderListItem,
  toProductDetail,
  toProductListItem,
  type AdminOrderRequestDto,
  type OrderListItemDto,
  type ProductDetailDto,
  type ProductListItem,
} from './shop.mapper.js'

type CreateProductInput = z.infer<typeof createProductSchema>
type UpdateProductInput = z.infer<typeof updateProductSchema>
type ProductListQuery = z.infer<typeof productListQuerySchema>
type CreateOrderInput = z.infer<typeof createOrderSchema>
type ReviewOrderInput = z.infer<typeof reviewOrderSchema>

function parseSort(sort?: string): Prisma.ProductOrderByWithRelationInput {
  if (!sort) return { createdAt: 'desc' }
  const [field, dir] = sort.split(':')
  const allowed = new Set(['createdAt', 'title', 'priceMinor', 'updatedAt'])
  if (!allowed.has(field)) return { createdAt: 'desc' }
  return { [field]: dir === 'asc' ? 'asc' : 'desc' }
}

export async function listProducts(
  query: ProductListQuery,
  publishedOnly: boolean,
): Promise<ApiListResponse<ProductListItem>> {
  const { page, pageSize, search, type, sort } = query
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(publishedOnly ? { isPublished: true } : {}),
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: parseSort(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return {
    data: rows.map(toProductListItem),
    meta: { page, pageSize, total },
  }
}

export async function getProductByIdOrSlug(
  idOrSlug: string,
  includeStaffFields: boolean,
): Promise<ProductDetailDto> {
  const product = await prisma.product.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(includeStaffFields ? {} : { isPublished: true }),
    },
  })
  if (!product) {
    throw notFound('Product not found')
  }
  return toProductDetail(product, includeStaffFields)
}

export async function createProduct(input: CreateProductInput): Promise<ProductDetailDto> {
  const existing = await prisma.product.findFirst({
    where: { slug: input.slug, deletedAt: null },
  })
  if (existing) {
    throw conflict('Product slug already exists')
  }

  const product = await prisma.product.create({ data: input })
  return toProductDetail(product, true)
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductDetailDto> {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
  })
  if (!product) {
    throw notFound('Product not found')
  }

  if (input.slug && input.slug !== product.slug) {
    const slugTaken = await prisma.product.findFirst({
      where: { slug: input.slug, deletedAt: null, id: { not: id } },
    })
    if (slugTaken) {
      throw conflict('Product slug already exists')
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: input,
  })
  return toProductDetail(updated, true)
}

export async function deleteProduct(id: string): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
  })
  if (!product) {
    throw notFound('Product not found')
  }

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isPublished: false },
  })
}

export async function createOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<OrderListItemDto> {
  const productIds = [...new Set(input.items.map((item) => item.productId))]
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      deletedAt: null,
      isPublished: true,
    },
  })

  if (products.length !== productIds.length) {
    throw notFound('One or more products not found')
  }

  const productById = new Map(products.map((p) => [p.id, p]))
  let totalMinor = 0
  const lineItems: {
    productId: string
    quantity: number
    unitPriceMinor: number
    title: string
  }[] = []

  for (const item of input.items) {
    const product = productById.get(item.productId)!
    if (product.priceMinor <= 0) {
      throw validationError(`"${product.title}" is not available for purchase`)
    }
    if (product.stock != null && product.stock < item.quantity) {
      throw validationError(`Insufficient stock for "${product.title}"`)
    }
    totalMinor += product.priceMinor * item.quantity
    lineItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPriceMinor: product.priceMinor,
      title: product.title,
    })
  }

  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING,
        totalMinor,
        items: {
          create: lineItems,
        },
      },
      include: { items: true },
    })
  })

  return toOrderListItem(order)
}

const adminOrderInclude = {
  items: true,
  user: { select: { id: true, name: true, phone: true } },
} satisfies Prisma.OrderInclude

export async function listAdminOrders(
  status: OrderStatus = OrderStatus.PENDING,
): Promise<AdminOrderRequestDto[]> {
  const rows = await prisma.order.findMany({
    where: { status },
    include: adminOrderInclude,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((row) => toAdminOrderRequest(row))
}

export async function reviewOrderRequest(
  orderId: string,
  input: ReviewOrderInput,
): Promise<AdminOrderRequestDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { id: true, name: true, phone: true } } },
  })
  if (!order) {
    throw notFound('Order not found')
  }
  if (order.status !== OrderStatus.PENDING) {
    throw validationError('Only pending orders can be reviewed')
  }

  if (input.action === 'cancel') {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: adminOrderInclude,
    })
    return toAdminOrderRequest(updated)
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (product?.stock != null) {
        const result = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (result.count === 0) {
          throw validationError(`Insufficient stock for "${item.title}"`)
        }
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
      include: adminOrderInclude,
    })
  })

  return toAdminOrderRequest(updated)
}

export async function listMyOrders(userId: string): Promise<OrderListItemDto[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toOrderListItem)
}

export async function getMyOrder(userId: string, orderId: string): Promise<OrderListItemDto> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  })
  if (!order) {
    throw notFound('Order not found')
  }
  return toOrderListItem(order)
}
