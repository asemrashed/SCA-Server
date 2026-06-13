import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/auth.js'
import * as controller from './upload.controller.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

export const uploadRouter = Router()

uploadRouter.post('/', authenticate, upload.single('file'), controller.uploadFile)
