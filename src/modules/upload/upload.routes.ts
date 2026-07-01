import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { uploadMiddleware } from './upload.multer.js'
import * as controller from './upload.controller.js'

export const uploadRouter = Router()

uploadRouter.post('/', authenticate, uploadMiddleware.single('file'), controller.uploadFile)
