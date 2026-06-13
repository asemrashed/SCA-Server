import type { Request, Response, NextFunction } from 'express'
import { validationError } from '../../lib/errors.js'
import { storage } from '../../lib/storage.js'

const ALLOWED_FOLDERS = new Set(['images', 'videos', 'documents', 'files'])

export async function uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file
    if (!file) {
      throw validationError('No file provided')
    }

    const folder = String(req.body.folder ?? 'files')
    if (!ALLOWED_FOLDERS.has(folder)) {
      throw validationError('Invalid upload folder')
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
    const key = `${folder}/${Date.now()}-${safeName}`

    const result = await storage.upload(key, file.buffer, file.mimetype)

    res.status(201).json({
      data: {
        url: result.url,
        key: result.key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    })
  } catch (err) {
    next(err)
  }
}
