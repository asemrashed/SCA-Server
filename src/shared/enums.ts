export enum Role {
  STUDENT = 'STUDENT',
  INSTRUCTOR = 'INSTRUCTOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export enum PhoneVerificationPurpose {
  SIGNUP = 'SIGNUP',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum DeliveryMode {
  LIVE = 'LIVE',
  RECORDED = 'RECORDED',
}

export enum BatchStatus {
  DRAFT = 'DRAFT',
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum LessonType {
  RECORDED = 'RECORDED',
  LIVE = 'LIVE',
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
}

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum EnrollmentKind {
  BATCH = 'BATCH',
  COURSE = 'COURSE',
}

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  WRITTEN = 'WRITTEN',
  PDF = 'PDF',
}

export enum ExamStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum PaymentPurpose {
  ORDER = 'ORDER',
  ENROLLMENT = 'ENROLLMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum MonthlyPaymentStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProductType {
  BOOK = 'BOOK',
  NOTES = 'NOTES',
  QUESTION_BANK = 'QUESTION_BANK',
  OTHER = 'OTHER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum ResourceCategory {
  GENERAL = 'GENERAL',
  LECTURE_SHEET = 'LECTURE_SHEET',
  SOLUTION_PDF = 'SOLUTION_PDF',
  NOTICE = 'NOTICE',
  RESULT_SHEET = 'RESULT_SHEET',
  EXAM = 'EXAM',
  ASSIGNMENT = 'ASSIGNMENT',
}
