export enum Role {
  STUDENT = 'STUDENT',
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

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum LiveClassType {
  RECURRING = 'RECURRING',
  ONE_TIME = 'ONE_TIME',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum MonthlyPaymentStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
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
  MATH_SUGGESTION = 'MATH_SUGGESTION',
  THEORY_SUGGESTION = 'THEORY_SUGGESTION',
  EXAM = 'EXAM',
  ASSIGNMENT = 'ASSIGNMENT',
  QUESTION_BANK = 'QUESTION_BANK',
}

export enum ResourceSubmissionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
