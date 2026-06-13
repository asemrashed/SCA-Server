import type { Request, Response, NextFunction } from 'express'
import { Role } from '../../shared/enums.js'
import * as assessmentService from './assessment.service.js'

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export async function listQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await assessmentService.listQuestions(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const question = await assessmentService.createQuestion(req.body)
    res.status(201).json({ data: question })
  } catch (err) {
    next(err)
  }
}

export async function listBatchExams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await assessmentService.listBatchExams(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.batchId),
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function listCourseExams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await assessmentService.listCourseExams(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.courseId),
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function createExam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exam = await assessmentService.createExam(req.body)
    res.status(201).json({ data: exam })
  } catch (err) {
    next(err)
  }
}

export async function startAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attempt = await assessmentService.startExamAttempt(req.auth!.userId, param(req.params.examId))
    res.status(201).json({ data: attempt })
  } catch (err) {
    next(err)
  }
}

export async function updateAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attempt = await assessmentService.updateExamAttempt(
      req.auth!.userId,
      param(req.params.id),
      req.body,
    )
    res.json({ data: attempt })
  } catch (err) {
    next(err)
  }
}

export async function listBatchAssignments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await assessmentService.listBatchAssignments(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.batchId),
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function listCourseAssignments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await assessmentService.listCourseAssignments(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.courseId),
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignment = await assessmentService.createAssignment(req.body)
    res.status(201).json({ data: assignment })
  } catch (err) {
    next(err)
  }
}

export async function submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const submission = await assessmentService.submitAssignment(
      req.auth!.userId,
      param(req.params.id),
      req.body,
    )
    res.status(201).json({ data: submission })
  } catch (err) {
    next(err)
  }
}

export async function gradeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const submission = await assessmentService.gradeSubmission(
      req.auth!.userId,
      req.auth!.role,
      param(req.params.id),
      req.body,
    )
    res.json({ data: submission })
  } catch (err) {
    next(err)
  }
}
