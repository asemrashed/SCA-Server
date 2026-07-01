import type { Request, Response, NextFunction } from 'express'
import { validationError } from '../../lib/errors.js'
import { absolutePathForKey, publicUrlForKey } from '../../lib/storage.js'

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

    const key = `${folder}/${file.filename}`
    const expectedPath = absolutePathForKey(key)
    if (file.path !== expectedPath) {
      throw validationError('Upload path mismatch')
    }

    res.status(201).json({
      data: {
        url: publicUrlForKey(key),
        key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    })
  } catch (err) {
    next(err)
  }
}
