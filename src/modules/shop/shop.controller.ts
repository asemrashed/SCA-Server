import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../../lib/jwt.js'
import type { Role } from '../../shared/enums.js'
import { isStaff } from '../../shared/roles.js'
import { OrderStatus } from '../../shared/enums.js'
import * as shopService from './shop.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

function getOptionalAuth(req: Request): { role?: Role; userId?: string } {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return {}
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    return { role: payload.role, userId: payload.sub }
  } catch {
    return {}
  }
}

function getOptionalRole(req: Request): Role | undefined {
  return getOptionalAuth(req).role
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.auth?.role ?? getOptionalRole(req)
    const publishedOnly = !role || !isStaff(role)
    const result = await shopService.listProducts(req.query as never, publishedOnly)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.auth?.role ?? getOptionalRole(req)
    const includeStaffFields = role !== undefined && isStaff(role)
    const product = await shopService.getProductByIdOrSlug(
      param(req.params.idOrSlug),
      includeStaffFields,
    )
    res.json({ data: product })
  } catch (err) {
    next(err)
  }
}

export async function getProductDigitalAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = req.auth ?? getOptionalAuth(req)
    const data = await shopService.getProductDigitalAccess(auth.userId, param(req.params.idOrSlug))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function streamProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth ?? getOptionalAuth(req)
    const { buffer, contentType, title, isPreview } = await shopService.streamProductPdf(
      auth.userId,
      param(req.params.idOrSlug),
    )

    const safeName = title.replace(/[^\w\s.-]/g, '').trim() || 'document'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${safeName}.pdf"`)
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Preview-Mode', isPreview ? 'preview' : 'full')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await shopService.createProduct(req.body)
    res.status(201).json({ data: product })
  } catch (err) {
    next(err)
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await shopService.updateProduct(param(req.params.id), req.body)
    res.json({ data: product })
  } catch (err) {
    next(err)
  }
}

export async function removeProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await shopService.deleteProduct(param(req.params.id))
    res.json({ data: { success: true } })
  } catch (err) {
    next(err)
  }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await shopService.createOrder(req.auth!.userId, req.body)
    res.status(201).json({ data: order })
  } catch (err) {
    next(err)
  }
}

export async function listMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await shopService.listMyOrders(req.auth!.userId)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function getMyOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await shopService.getMyOrder(req.auth!.userId, param(req.params.id))
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function listAdminOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const status = (req.query.status as OrderStatus | undefined) ?? OrderStatus.PENDING
    const data = await shopService.listAdminOrders(status)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function reviewOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await shopService.reviewOrderRequest(param(req.params.id), req.body)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
