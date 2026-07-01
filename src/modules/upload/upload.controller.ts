import fs from 'node:fs/promises'
import path from 'node:path'
import type { Request, Response, NextFunction } from 'express'
import { uploadDir } from '../../config/env.js'
import { validationError } from '../../lib/errors.js'
import { publicUrlForKey } from '../../lib/storage.js'
import { maxBytesForUploadFolder } from '../../shared/constants.js'

const ALLOWED_FOLDERS = new Set(['images', 'videos', 'documents', 'files'])

function keyFromSavedPath(filePath: string): string {
  const root = uploadDir()
  const relative = path.relative(root, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw validationError('Upload path mismatch')
  }
  return relative.split(path.sep).join('/')
}

export async function uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file
    if (!file) {
      throw validationError('No file provided')
    }

    const key = keyFromSavedPath(file.path)
    const folder = key.split('/')[0] ?? 'files'
    if (!ALLOWED_FOLDERS.has(folder)) {
      await fs.unlink(file.path).catch(() => {})
      throw validationError('Invalid upload folder')
    }

    const maxBytes = maxBytesForUploadFolder(folder)
    if (file.size > maxBytes) {
      await fs.unlink(file.path).catch(() => {})
      const maxMb = Math.round(maxBytes / (1024 * 1024))
      throw validationError(`File too large. Maximum upload size for ${folder} is ${maxMb} MB.`)
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
