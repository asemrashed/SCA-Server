import type { Request, Response, NextFunction } from 'express'
import * as authService from './auth.service.js'
import { clearRefreshCookie, getRefreshToken, setRefreshCookie } from './auth.cookies.js'

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await authService.register(req.body)
    setRefreshCookie(res, session.refreshToken)
    res.status(201).json({ data: authService.toAuthResponse(session) })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await authService.login(req.body)
    setRefreshCookie(res, session.refreshToken)
    res.json({ data: authService.toAuthResponse(session) })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getRefreshToken(req)
    if (!token) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Refresh token required' },
      })
      return
    }
    const session = await authService.refresh(token)
    setRefreshCookie(res, session.refreshToken)
    res.json({ data: authService.toAuthResponse(session) })
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(getRefreshToken(req))
    clearRefreshCookie(res)
    res.json({ data: { success: true } })
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.auth!.userId)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.updateMe(req.auth!.userId, req.body)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
}
