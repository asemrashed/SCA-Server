import { Router } from 'express'
import * as controller from './lesson-playback.controller.js'

export const lessonPlaybackRouter = Router()

lessonPlaybackRouter.get('/:lessonId/play-meta', controller.playMeta)
lessonPlaybackRouter.get('/:lessonId/embed', controller.embed)
lessonPlaybackRouter.get('/:lessonId/thumbnail', controller.thumbnail)
lessonPlaybackRouter.get('/:lessonId/stream', controller.stream)
