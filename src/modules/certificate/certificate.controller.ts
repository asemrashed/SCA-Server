import type { Request, Response, NextFunction } from 'express'
import * as certificateService from './certificate.service.js'

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await certificateService.listMyCertificates(req.auth!.userId)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}

export async function issue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await certificateService.issueCertificate(
      req.auth!.userId,
      req.auth!.role,
      req.body,
    )
    res.status(201).json({ data })
  } catch (err) {
    next(err)
  }
}

export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serial = String(req.params.serial)
    const data = await certificateService.verifyCertificate(serial)
    res.json({ data })
  } catch (err) {
    next(err)
  }
}
